const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { generateRefCitoyen } = require('../services/refGenerator.service');
const { logStatusChange } = require('../services/statusHistory.service');
const { notifyNewDeclaration } = require('../services/notification.service');

/* ── Helper: map DB enum statuses → citizen-facing statuses ── */
const CITIZEN_STATUS_MAP = {
  soumise:        'EN ATTENTE',
  assignee_chef:  'EN ATTENTE',
  assignee_agent: 'EN ATTENTE',
  refusee_chef:   'EN ATTENTE',
  refusee_agent:  'EN ATTENTE',
  en_cours:       'EN COURS',
  resolue:        'TERMINE',
  cloturee:       'TERMINE',
};

function mapCitizenStatus(decl) {
  return {
    ...decl,
    status: CITIZEN_STATUS_MAP[decl.status] || decl.status,
  };
}

const fs = require('fs');
const path = require('path');

/* ──────────── POST /api/declarations ──────────── */
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, delegation_id, latitude, longitude, address } = req.body;

    // Resolve delegation code for ref_citoyen generation
    const actualDelegationId = delegation_id || req.user.delegation_id;

    const { data: deleg } = await supabase
      .from('delegations')
      .select('id, code')
      .eq('id', actualDelegationId)
      .single();

    if (!deleg) {
      return res.status(400).json({ error: 'Délégation invalide.' });
    }

    const refCitoyen = await generateRefCitoyen(deleg.code);
    
    let publicUrl = null;
    
    if (req.file) {
      const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `citoyen_${req.user.id}_${Date.now()}${ext}`;
      const destPath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(destPath, req.file.buffer);

      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5005}`;
      publicUrl = `${baseUrl}/uploads/${filename}`;
    }

    const { data: decl, error } = await supabase
      .from('declarations')
      .insert({
        title:         title.trim(),
        description:   description.trim(),
        category:      category || null,
        delegation_id: actualDelegationId,
        citizen_id:    req.user.id,
        user_id:       req.user.id,
        ref_citoyen:   refCitoyen,
        status:        'soumise',
        latitude:      latitude || null,
        longitude:     longitude || null,
        address:       address || null,
        priority:      req.body.priority || 'moyenne',
        photo_avant:   publicUrl,
        is_deleted:    false,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Declarations] Create error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la soumission.' });
    }

    if (publicUrl) {
      await supabase.from('declaration_photos').insert({
        declaration_id: decl.id,
        url: publicUrl,
        uploaded_by: req.user.id
      });
    }

    await logStatusChange(decl.id, null, 'soumise', req.user.id);
    await notifyNewDeclaration(req.app, decl);

    return res.status(201).json({ declaration: mapCitizenStatus(decl) });
  } catch (err) {
    console.error('[Declarations] Create error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/declarations/mine ──────────── */
exports.mine = async (req, res) => {
  try {
    // v_declarations_citizen has both citizen_id and user_id columns
    const { data, error } = await supabase
      .from('v_declarations_citizen')
      .select('*')
      .or(`user_id.eq.${req.user.id},citizen_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Declarations] Mine error:', error.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(200).json({ declarations: data });
  } catch (err) {
    console.error('[Declarations] Mine error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/declarations/nearby ──────────── */
exports.nearby = async (req, res) => {
  try {
    const { latitude, longitude, category } = req.query;
    if (!latitude || !longitude) return res.json([]);
    
    // Fetch recent open declarations
    let query = supabase.from('declarations')
      .select('id, title, category, latitude, longitude')
      .eq('status', 'soumise')
      .eq('is_deleted', false);
      
    if (category) query = query.eq('category', category);
    
    const { data, error } = await query.limit(100);
    if (error) throw error;
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusInDegrees = 0.005; // Roughly 500 meters
    
    const nearby = data.filter(d => {
      if (!d.latitude || !d.longitude) return false;
      const dLat = Math.abs(d.latitude - lat);
      const dLng = Math.abs(d.longitude - lng);
      return dLat < radiusInDegrees && dLng < radiusInDegrees;
    });
    
    return res.json(nearby);
  } catch (err) {
    console.error('[Declarations] Nearby error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/declarations/map ──────────── */
exports.map = async (req, res) => {
  try {
    const { pool } = require('../config/db');
    
    // We query declarations directly to ensure we get all statuses (soumise, en_cours, resolue, cloturee)
    // and join with ratings to get the citizen's score and comment if they exist.
    const sql = `
      SELECT 
        d.*, 
        r.score as rating, 
        r.comment as rating_comment
      FROM declarations d
      LEFT JOIN ratings r ON d.id = r.declaration_id
      WHERE d.is_deleted = false
        AND d.latitude IS NOT NULL
        AND d.longitude IS NOT NULL
      ORDER BY d.created_at DESC
    `;
    
    const { rows } = await pool.query(sql);

    return res.status(200).json({ declarations: rows });
  } catch (err) {
    console.error('[Declarations] Map error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PUT /api/declarations/:id ──────────── */
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const { data: existing, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, citizen_id, user_id, status')
      .eq('id', id)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    // Check ownership (citizen_id or user_id)
    if (existing.citizen_id !== req.user.id && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres déclarations.' });
    }

    if (existing.status !== 'soumise') {
      return res.status(403).json({ error: 'Modification impossible : la déclaration n\'est plus au statut soumise.' });
    }

    const { title, description, category, latitude, longitude, address } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (title)       updates.title       = title.trim();
    if (description) updates.description = description.trim();
    if (category)    updates.category    = category;
    if (latitude !== undefined)  updates.latitude  = latitude;
    if (longitude !== undefined) updates.longitude = longitude;
    if (address)     updates.address     = address;

    const { data: updated, error: updateErr } = await supabase
      .from('declarations')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[Declarations] Update error:', updateErr.message);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }

    return res.status(200).json({ declaration: mapCitizenStatus(updated) });
  } catch (err) {
    console.error('[Declarations] Update error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── DELETE /api/declarations/:id ──────────── */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, citizen_id, user_id, status')
      .eq('id', id)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    if (existing.citizen_id !== req.user.id && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres déclarations.' });
    }

    if (existing.status !== 'soumise') {
      return res.status(403).json({ error: 'Suppression impossible : la déclaration n\'est plus au statut soumise.' });
    }

    // Soft delete
    const { error: delErr } = await supabase
      .from('declarations')
      .update({ deleted_at: new Date().toISOString(), is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (delErr) {
      console.error('[Declarations] Delete error:', delErr.message);
      return res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }

    return res.status(200).json({ message: 'Déclaration supprimée.' });
  } catch (err) {
    console.error('[Declarations] Delete error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/declarations/:id/vote ──────────── */
exports.vote = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: decl } = await supabase
      .from('declarations')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .single();

    if (!decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    // Check duplicate vote — DB unique on (declaration_id, user_id)
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('declaration_id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existingVote) {
      return res.status(409).json({ error: 'Vous avez déjà voté pour cette déclaration.' });
    }

    const { error: insertErr } = await supabase
      .from('votes')
      .insert({
        declaration_id: id,
        user_id:        req.user.id,
        vote:           'pour',
      });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return res.status(409).json({ error: 'Vous avez déjà voté pour cette déclaration.' });
      }
      console.error('[Declarations] Vote error:', insertErr.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    // Increment votes_count on declaration
    const { error: rpcErr } = await supabase.rpc('increment_vote_count', {
      p_declaration_id: id,
    });

    if (rpcErr) {
      console.error('[Declarations] Vote count increment error:', rpcErr.message);
    }

    return res.status(201).json({ message: 'Vote enregistré.' });
  } catch (err) {
    console.error('[Declarations] Vote error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/declarations/:id/rate ──────────── */
exports.rate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { score, comment } = req.body;

    // Check declaration exists and is resolue or cloturee
    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('id, citizen_id, user_id, status')
      .eq('id', id)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .single();

    if (fetchErr || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    if (decl.citizen_id !== req.user.id && decl.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez évaluer que vos propres déclarations.' });
    }

    if (!['resolue', 'cloturee'].includes(decl.status)) {
      return res.status(403).json({ error: 'Évaluation possible uniquement après résolution.' });
    }

    // Check duplicate rating — DB unique on (declaration_id, citizen_id)
    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('declaration_id', id)
      .eq('citizen_id', req.user.id)
      .maybeSingle();

    if (existingRating) {
      return res.status(409).json({ error: 'Vous avez déjà évalué cette déclaration.' });
    }

    const { error: insertErr } = await supabase
      .from('ratings')
      .insert({
        declaration_id: id,
        citizen_id:     req.user.id,
        score,
        comment:        comment?.trim() || null,
      });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return res.status(409).json({ error: 'Vous avez déjà évalué cette déclaration.' });
      }
      console.error('[Declarations] Rate error:', insertErr.message);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    return res.status(201).json({ message: 'Évaluation enregistrée.' });
  } catch (err) {
    console.error('[Declarations] Rate error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/declarations/analyze-photo ──────────── */
exports.analyzePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune photo fournie.' });
    }

    const path = require('path');
    const fs = require('fs');
    const { analyzePhoto } = require('../services/vision.service');

    // Save temp file
    const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    
    const ext = path.extname(req.file.originalname) || '.jpg';
    const tmpFilename = `analyze_${Date.now()}${ext}`;
    const tmpPath = path.join(UPLOAD_DIR, tmpFilename);
    
    fs.writeFileSync(tmpPath, req.file.buffer);

    // Analyze with Gemini Vision
    const analysis = await analyzePhoto(tmpPath);

    // Clean up temp file
    try { fs.unlinkSync(tmpPath); } catch (_) {}

    return res.status(200).json({
      success: true,
      analysis: {
        category:       analysis.category,
        title:          analysis.title,
        description:    analysis.description,
        priority:       analysis.priority,
        is_hazard:      analysis.is_hazard,
        hazard_details: analysis.hazard_details,
        confidence:     analysis.confidence,
        suggestions:    analysis.suggestions
      }
    });

  } catch (err) {
    console.error('[Analyze] Error:', err.message);
    return res.status(500).json({ 
      error: 'Analyse impossible. Vérifiez GEMINI_API_KEY.' 
    });
  }
};

/* ──────────── GET /api/declarations/:id/comments ──────────── */
exports.listComments = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('citizen_id, user_id')
      .eq('id', id)
      .single();

    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.citizen_id !== req.user.id && decl.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    // Citizen can only see agent_citizen
    const { data: comments, error } = await supabase
      .from('internal_comments')
      .select(`
        id,
        content,
        created_at,
        channel,
        user_id,
        users ( id, first_name, last_name, role )
      `)
      .eq('declaration_id', id)
      .eq('channel', 'agent_citizen')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Declarations] listComments error:', error);
      // Fallback if 'channel' column doesn't exist yet
      if (error.code === 'PGRST106') {
         return res.json({ comments: [] });
      }
      return res.status(500).json({ error: 'Erreur lors de la récupération des commentaires.' });
    }

    res.json({ comments });
  } catch (err) {
    console.error('[Declarations] listComments exception:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/declarations/:id/comments ──────────── */
exports.addComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { content } = req.body;

    // Verify ownership
    const { data: decl, error: fetchErr } = await supabase
      .from('declarations')
      .select('citizen_id, user_id')
      .eq('id', id)
      .single();

    if (fetchErr || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.citizen_id !== req.user.id && decl.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const { data: comment, error } = await supabase
      .from('internal_comments')
      .insert({
        declaration_id: id,
        user_id: req.user.id,
        content,
        channel: 'agent_citizen'
      })
      .select(`
        id,
        content,
        created_at,
        channel,
        user_id,
        users ( id, first_name, last_name, role )
      `)
      .single();

    if (error) {
      console.error('[Declarations] addComment error:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire.' });
    }

    res.status(201).json({ comment });
  } catch (err) {
    console.error('[Declarations] addComment exception:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
