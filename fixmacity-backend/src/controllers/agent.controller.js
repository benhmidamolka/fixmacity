// src/controllers/agent.controller.js
const supabase = require('../config/db');
const { logStatusChange } = require('../services/statusHistory.service');
const { notifyStatusChange } = require('../services/notification.service');
const { cloudinary } = require('../config/cloudinary');

// ─── helpers ──────────────────────────────────────────────────────────────────
function agentScope(req) {
  return req.user.department_id;
}

// ─── GET /api/agent/declarations ─────────────────────────────────────────────
exports.getDeclarations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('declarations')
      .select(`
        id, ref_citoyen, ref_service, title, category, status,
        created_at, assigned_at, started_at, votes_count, address,
        delegations:delegation_id (name, code),
        citizen:citizen_id (first_name, last_name, email)
      `, { count: 'exact' })
      .eq('department_id', agentScope(req))
      .is('deleted_at', null)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      declarations: data,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit) },
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

    const { data, error } = await supabase
      .from('declarations')
      .select(`
        *,
        delegations:delegation_id (name, code),
        department:department_id (name_fr, name_ar, name_en, code),
        citizen:citizen_id (id, first_name, last_name, email),
        agent:agent_id (id, first_name, last_name, email)
      `)
      .eq('id', id)
      .eq('department_id', agentScope(req))
      .is('deleted_at', null)
      .or('is_deleted.eq.false,is_deleted.is.null')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Déclaration introuvable' });
    }

    // Photos
    const { data: photos } = await supabase
      .from('declaration_photos')
      .select('id, url, public_id, uploaded_by, created_at')
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    // Status history
    const { data: history } = await supabase
      .from('status_history')
      .select(`
        id, old_status, new_status, raison, created_at,
        changed_by_user:changed_by (first_name, last_name, role)
      `)
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    // Internal comments
    const { data: comments } = await supabase
      .from('internal_comments')
      .select(`
        id, content, channel, created_at,
        author:user_id (first_name, last_name, role)
      `)
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    res.json({ 
      ...data, 
      photos: photos || [], 
      history: history || [], 
      comments: comments || [] 
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

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, ref_citoyen, status, citizen_id')
      .eq('id', id)
      .eq('department_id', agentScope(req))
      .single();

    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable' });
    if (decl.status !== 'assignee_agent') {
      return res.status(400).json({ error: 'Statut invalide pour acceptation' });
    }

    const { error: updateErr } = await supabase
      .from('declarations')
      .update({ 
        status: 'en_cours', 
        agent_id: req.user.id, 
        started_at: req.body.date_debut || new Date().toISOString() 
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    await logStatusChange(id, 'assignee_agent', 'en_cours', req.user.id);
    await notifyStatusChange(req.app, decl, decl.citizen_id, 'en_cours');

    res.json({ message: 'Déclaration acceptée — statut: en_cours' });
  } catch (err) {
    console.error('[Agent] acceptDeclaration:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/agent/declarations/:id/refuse ─────────────────────────────────
exports.refuseDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const { raison } = req.body;

    if (!raison || !raison.trim()) {
      return res.status(400).json({ error: 'Le motif de refus est obligatoire' });
    }

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, ref_citoyen, status, citizen_id')
      .eq('id', id)
      .eq('department_id', agentScope(req))
      .single();

    if (fetchErr || !decl) return res.status(404).json({ error: 'Signalement introuvable' });
    if (decl.status !== 'assignee_agent') {
      return res.status(400).json({ error: 'Seuls les signalements assignés à l\'agent peuvent être refusés' });
    }

    const { error: updateErr } = await supabase
      .from('declarations')
      .update({ status: 'refusee_agent', agent_id: null })
      .eq('id', id);

    if (updateErr) throw updateErr;

    await logStatusChange(id, decl.status, 'refusee_agent', req.user.id, raison);
    await notifyStatusChange(req.app, decl, decl.citizen_id, 'refusee_agent');

    res.json({ message: 'Déclaration refusée — retour au Chef de Service' });
  } catch (err) {
    console.error('[Agent] refuseDeclaration:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/agent/declarations/:id/photo ──────────────────────────────────
exports.uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, status')
      .eq('id', id)
      .eq('department_id', agentScope(req))
      .single();

    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable' });
    if (decl.status !== 'en_cours') {
      return res.status(403).json({ error: 'Photos autorisées uniquement en statut "en_cours"' });
    }

    const fs = require('fs');
    const path = require('path');

    let photoUrl;
    let publicId = null;

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `fixmacity/${id}`, resource_type: 'image' },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      photoUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    } else {
      // Fallback: Local Storage
      const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `agent_${req.user.id}_${Date.now()}${ext}`;
      const destPath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(destPath, req.file.buffer);

      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5005}`;
      photoUrl = `${baseUrl}/uploads/${filename}`;
      console.warn('[Agent] Cloudinary not configured — using local fallback:', photoUrl);
    }

    const { error: insertErr } = await supabase
      .from('declaration_photos')
      .insert({
        declaration_id: id,
        url: photoUrl,
        public_id: publicId,
        uploaded_by: req.user.id,
      });

    if (insertErr) throw insertErr;

    res.status(201).json({ url: photoUrl });
  } catch (err) {
    console.error('[Agent] uploadPhoto:', err.message);
    res.status(500).json({ error: 'Erreur lors du téléversement' });
  }
};

// ─── POST /api/agent/declarations/:id/resolve ────────────────────────────────
exports.resolveDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const { rapport_interne, date_fin } = req.body;

    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, ref_citoyen, status, citizen_id, started_at')
      .eq('id', id)
      .eq('department_id', agentScope(req))
      .single();

    if (fetchErr || !decl) return res.status(404).json({ error: 'Signalement introuvable ou non assigné' });
    if (decl.status !== 'en_cours') {
      return res.status(400).json({ error: 'Le signalement n\'est pas dans un état permettant la résolution' });
    }

    // Exception 4: Date validation
    if (decl.started_at && date_fin) {
      const d1 = new Date(decl.started_at);
      const d2 = new Date(date_fin);
      if (d2 < d1) {
        return res.status(400).json({ error: 'La date de fin doit être supérieure à la date de début' });
      }
    }

    // Exception 1: Check for proof photos
    const { data: photos } = await supabase
      .from('declaration_photos')
      .select('id')
      .eq('declaration_id', id)
      .limit(1);

    if (!photos || photos.length === 0) {
      return res.status(400).json({ error: 'Une photo de résolution est obligatoire' });
    }

    const { error: updateErr } = await supabase
      .from('declarations')
      .update({ 
        status: 'resolue', 
        resolved_at: new Date().toISOString(),
        internal_intervention_report: rapport_interne || null,
        intervention_ended_at: date_fin || new Date().toISOString()
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    await logStatusChange(id, 'en_cours', 'resolue', req.user.id);
    await notifyStatusChange(req.app, decl, decl.citizen_id, 'resolue');

    res.json({ message: 'Déclaration résolue' });
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
        author:user_id (first_name, last_name, role)
      `)
      .eq('declaration_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ comments: data });
  } catch (err) {
    console.error('[Agent] getComments:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/agent/declarations/:id/comments ───────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, channel } = req.body;

    if (!content || !content.trim()) return res.status(400).json({ error: 'Contenu requis' });

    const { data, error } = await supabase
      .from('internal_comments')
      .insert({ 
        declaration_id: id, 
        user_id: req.user.id, 
        content: content.trim(),
        channel: channel || 'chef_agent'
      })
      .select(`id, content, channel, created_at, author:user_id (first_name, last_name, role)`)
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[Agent] addComment:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};