'use strict';

const path    = require('path');
const fs      = require('fs');
const supabase = require('../config/db');
const { validationResult }     = require('express-validator');
const { generateRefCitoyen }   = require('../services/refGenerator.service');
const { logStatusChange }      = require('../services/statusHistory.service');
const { notifyNewDeclaration } = require('../services/notification.service');
const { calculatePriorityScore } = require('../services/priority.service');

// ─── helpers ─────────────────────────────────────────────────────────────────
 
function mapCitizenStatus(decl) {
  const CITIZEN_STATUS_MAP = {
    soumise:        'EN ATTENTE',
    assignee_chef:  'EN ATTENTE',
    assignee_agent: 'EN ATTENTE',
    en_cours:       'EN COURS',
    resolue:        'TERMINÉ',
    cloturee:       'TERMINÉ',
    refusee_chef:   'EN ATTENTE',
    refusee_agent:  'EN ATTENTE',
  };
  return { ...decl, citizen_status: CITIZEN_STATUS_MAP[decl.status] || 'EN ATTENTE' };
}
 
 
/**
 * Haversine distance in metres between two lat/lng points.
 * Used server-side to detect sensitive location proximity.
 */
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
 
/**
 * Returns { is_sensitive, sensitive_type } by querying sensitive_locations table.
 * Falls back to false/null if table doesn't exist yet.
 */
async function detectSensitiveLocation(lat, lng) {
  if (!lat || !lng) return { is_sensitive: false, sensitive_type: null };
  try {
    const { data: locs } = await supabase.from('sensitive_locations').select('*');
    if (!locs?.length) return { is_sensitive: false, sensitive_type: null };
    for (const loc of locs) {
      const dist = haversineM(lat, lng, loc.latitude, loc.longitude);
      if (dist <= loc.radius_m) return { is_sensitive: true, sensitive_type: loc.type };
    }
    return { is_sensitive: false, sensitive_type: null };
  } catch {
    return { is_sensitive: false, sensitive_type: null };
  }
}
 
/**
 * Map AI priority labels (from vision service) to:
 *  - DB priority column value ('haute'|'moyenne'|'basse')
 *  - ai_priority_score (number fed into trigger)
 */
function mapAIPriority(aiPriority) {
  const map = {
    haute:    { db: 'haute',   score: 10, computed: 'urgent' },
    urgente:  { db: 'haute',   score: 10, computed: 'urgent' },
    urgent:   { db: 'haute',   score: 10, computed: 'urgent' },
    critique: { db: 'haute',   score: 10, computed: 'urgent' },
    critical: { db: 'haute',   score: 10, computed: 'urgent' },
    moyenne:  { db: 'moyenne', score:  5, computed: 'normal' },
    normal:   { db: 'moyenne', score:  5, computed: 'normal' },
    normale:  { db: 'moyenne', score:  5, computed: 'normal' },
    medium:   { db: 'moyenne', score:  5, computed: 'normal' },
    basse:    { db: 'basse',   score:  1, computed: 'faible' },
    faible:   { db: 'basse',   score:  1, computed: 'faible' },
    low:      { db: 'basse',   score:  1, computed: 'faible' },
  };
  return map[aiPriority?.toLowerCase()] || { db: 'moyenne', score: 5, computed: 'normal' };
}
 
// ─── POST /api/declarations ───────────────────────────────────────────────────
 
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
 
    const {
      title, description, category,
      delegation_id, latitude, longitude, address,
      // AI vision data sent by citizen frontend (optional)
      ai_priority: ai_priority_raw,
      ai_confidence,
      ai_reasoning,
      ai_visible_issues,
      ai_severity_label,
      used_ai_vision,
    } = req.body;
 
    const actualDelegationId = delegation_id || req.user.delegation_id;
    const { data: deleg } = await supabase.from('delegations')
      .select('id, code').eq('id', actualDelegationId).single();
    if (!deleg) return res.status(400).json({ error: 'Délégation invalide.' });
 
    const refCitoyen = await generateRefCitoyen(deleg.code);
 
    // ── Save photo ─────────────────────────────────────────────────
    let publicUrl = null;
    let imagePath = null;
    if (req.file) {
      const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `citoyen_${req.user.id}_${Date.now()}${ext}`;
      imagePath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(imagePath, req.file.buffer);
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5005}`;
      publicUrl = `${baseUrl}/uploads/${filename}`;
    }
 
    // ── AI priority mapping ────────────────────────────────────────
    const usedAI = used_ai_vision === 'true' || used_ai_vision === true;
    const aiMap  = usedAI && ai_priority_raw ? mapAIPriority(ai_priority_raw) : null;
 
    // ── Sensitive location check ───────────────────────────────────
    const { is_sensitive, sensitive_type } = await detectSensitiveLocation(
      parseFloat(latitude), parseFloat(longitude)
    );
 
    // ── Compute initial priority_score for the trigger ─────────────
    //   trigger will fire on INSERT and set computed_priority
    const aiScore       = aiMap?.score    ?? 5;
    const locationBonus = is_sensitive
      ? (sensitive_type === 'hospital' ? 4 : sensitive_type === 'school' ? 3 : 2)
      : 0;
    const initialScore  = aiScore + locationBonus;
 
    // ── Insert declaration ─────────────────────────────────────────
    const { data: decl, error } = await supabase.from('declarations').insert({
      title:              title.trim(),
      description:        description.trim(),
      category:           category || null,
      delegation_id:      actualDelegationId,
      citizen_id:         req.user.id,
      user_id:            req.user.id,
      ref_citoyen:        refCitoyen,
      status:             'soumise',          // ← correct enum value
      latitude:           latitude  ? parseFloat(latitude)  : null,
      longitude:          longitude ? parseFloat(longitude) : null,
      address:            address   || null,
      // Priority
      priority:           aiMap?.db ?? req.body.priority ?? 'moyenne',
      priority_score:     initialScore,
      // AI fields
      ai_priority:        aiMap ? aiMap.computed : null,
      ai_priority_score:  aiScore,
      ai_confidence:      ai_confidence ? parseInt(ai_confidence) : null,
      ai_reasoning:       ai_reasoning  || null,
      ai_visible_issues:  ai_visible_issues ? JSON.stringify(ai_visible_issues) : '[]',
      ai_severity_label:  ai_severity_label || null,
      ai_analyzed_at:     usedAI ? new Date().toISOString() : null,
      used_ai_vision:     usedAI,
      // Location sensitivity
      is_sensitive,
      sensitive_type:     sensitive_type || null,
      // Photo
      photo_avant:        publicUrl,
      image_url:          publicUrl,
      is_deleted:         false,
    }).select('*').single();
 
    if (error) {
      console.error('[Declarations] create error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la soumission.' });
    }
 
    // Save photo record
    if (publicUrl) {
      await supabase.from('declaration_photos').insert({
        declaration_id: decl.id,
        url:            publicUrl,
        uploaded_by:    req.user.id,
        photo_type:     'photo_avant',
      });
    }
 
    await logStatusChange(decl.id, null, 'soumise', req.user.id);
    await notifyNewDeclaration(req.app, decl);

    // ── Async priority calculation (non-blocking) ─────────────────────────
    setImmediate(async () => {
      try {
        const pool = supabase.pool;
        const priority = await calculatePriorityScore({ ...decl, votes_count: 0 });
        await pool.query(
          'UPDATE declarations SET priority_score=$1, priority_label=$2, priority_method=$3 WHERE id=$4',
          [priority.priority_score, priority.priority_label, priority.priority_method || 'fallback', decl.id]
        );
        console.log(`[Priority] ${decl.id} → ${priority.priority_label} (${priority.priority_score})`);
      } catch (e) {
        console.warn('[Priority] async calc failed:', e.message);
      }
    });

    return res.status(201).json({
      declaration: mapCitizenStatus(decl),
      ai_used:         usedAI,
      computed_priority: decl.computed_priority,
      is_sensitive,
      sensitive_type,
    });
  } catch (err) {
    console.error('[Declarations] create exception:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
 
// ─── GET /api/declarations/nearby/sensitive ───────────────────────────────────
// Returns sensitive locations near a given lat/lng (for citizen map overlay)
 
exports.getNearSensitiveLocations = async (req, res) => {
  try {
    const { lat, lng, radius = 1000 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat et lng requis.' });
 
    const { data: locs } = await supabase.from('sensitive_locations').select('*');
    if (!locs) return res.json({ locations: [] });
 
    const nearby = locs.filter(loc => {
      const dist = haversineM(parseFloat(lat), parseFloat(lng), loc.latitude, loc.longitude);
      return dist <= parseInt(radius);
    }).map(loc => ({
      ...loc,
      distance_m: Math.round(haversineM(parseFloat(lat), parseFloat(lng), loc.latitude, loc.longitude)),
    }));
 
    return res.json({ locations: nearby });
  } catch (err) {
    console.error('[Declarations] getNearSensitiveLocations error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/declarations/mine ──────────── */
exports.mine = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * limitNum;

    const pool = supabase.pool;
    const [dataRes, countRes] = await Promise.all([
      pool.query(`SELECT d.*, CASE WHEN d.status IN ('resolue','cloturee') THEN 'RESOLUE'
        WHEN d.status IN ('assignee_chef','assignee_agent','en_cours','refusee_agent') THEN 'EN COURS'
        ELSE 'SOUMISE' END AS citizen_status
        FROM declarations d WHERE (d.citizen_id=$1 OR d.user_id=$1)
        AND d.is_deleted=false ORDER BY d.created_at DESC LIMIT $2 OFFSET $3`,
        [req.user.id, limitNum, offset]),
      pool.query(`SELECT COUNT(*) FROM declarations WHERE (citizen_id=$1 OR user_id=$1) AND is_deleted=false`, [req.user.id]),
    ]);
    const data = dataRes.rows;
    const count = parseInt(countRes.rows[0].count, 10);

    return res.status(200).json({ 
      declarations: data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
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
    const pool = supabase.pool;
    
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

    if (decl.citizen_id === req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas voter pour votre propre déclaration.' });
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

    // ── Async priority recalculation ───────────────────────────────────
    setImmediate(async () => {
      try {
        const { data: freshDecl } = await supabase
          .from('declarations')
          .select('*, votes_count')
          .eq('id', id)
          .single();
        if (freshDecl) {
          const priority = await calculatePriorityScore(freshDecl);
          const pool = supabase.pool;
          await pool.query(
            'UPDATE declarations SET priority_score=$1, priority_label=$2, priority_method=$3 WHERE id=$4',
            [priority.priority_score, priority.priority_label, priority.priority_method || 'fallback', id]
          );
        }
      } catch (e) {
        console.warn('[Priority] vote recalc failed:', e.message);
      }
    });

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
      .select('id, citizen_id, user_id, status, resolved_at')
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

    if (decl.status === 'resolue' && decl.resolved_at) {
      const resolvedDate = new Date(decl.resolved_at);
      const now = new Date();
      const diffDays = (now.getTime() - resolvedDate.getTime()) / (1000 * 3600 * 24);
      
      if (diffDays > 7) {
        return res.status(403).json({ error: 'Le délai de 7 jours pour évaluer ce signalement est dépassé.' });
      }
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

    // Update status to cloturee and set evaluation_date (using current time)
    await supabase
      .from('declarations')
      .update({ 
        status: 'cloturee', 
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    await logStatusChange(id, decl.status, 'cloturee', req.user.id, 'Signalement clôturé après évaluation citoyenne.');

    return res.status(201).json({ message: 'Évaluation enregistrée et signalement clôturé.' });
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
/* ──────────── GET /api/declarations/:id ──────────── */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: decl, error } = await supabase
      .from('declarations')
      .select(`
        *,
        delegations ( id, name, code ),
        declaration_photos ( id, url, uploaded_by, created_at ),
        status_history ( id, from_status, to_status, user_id, comment, created_at ),
        ratings ( id, score, comment, created_at )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .single();

    if (error || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable.' });
    }

    // Role-based visibility check
    if (req.user.role === 'citizen') {
      if (decl.citizen_id !== req.user.id && decl.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé.' });
      }
    }
    if (req.user.role === 'agent' || req.user.role === 'chef') {
      if (decl.department_id !== req.user.department_id) {
        return res.status(403).json({ error: 'Hors de votre département.' });
      }
    }

    return res.status(200).json({ declaration: mapCitizenStatus(decl) });
  } catch (err) {
    console.error('[Declarations] getById error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
exports.getPriorityDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: decl, error } = await supabase
      .from('declarations')
      .select('id, priority_score, priority, ai_priority, ai_priority_score, ai_confidence, ai_reasoning, ai_visible_issues, is_sensitive, sensitive_type, votes_count, president_override, president_override_note, priority_approved, priority_approved_at')
      .eq('id', id)
      .single();

    if (error || !decl) {
      return res.status(404).json({ error: 'Déclaration introuvable ou erreur DB.' });
    }

    const mapToLevel = (val) => {
      if (!val) return 'normal';
      const v = val.toLowerCase();
      if (['haute', 'high', 'critique', 'critical', 'urgent'].includes(v)) return 'urgent';
      if (['basse', 'low', 'faible'].includes(v)) return 'faible';
      return 'normal';
    };

    // Calculate score components
    let score_ai = 0;
    if (decl.ai_priority) {
      const level = mapToLevel(decl.ai_priority);
      score_ai = level === 'urgent' ? 10 : level === 'normal' ? 5 : 1;
    } else if (decl.ai_priority_score !== null && decl.ai_priority_score !== undefined) {
      score_ai = decl.ai_priority_score;
    }
    
    const score_votes = Math.min(decl.votes_count || 0, 5);
    const score_location = decl.is_sensitive
      ? (decl.sensitive_type === 'hospital' ? 4 : decl.sensitive_type === 'school' ? 3 : 2)
      : 0;
    
    // Capped at 10 for the UI display, but computed score can be full sum
    const computed_score = score_ai + score_votes + score_location;
    const score_total = Math.min(10, computed_score);

    const computed_priority = score_total >= 7 ? 'urgent' : score_total >= 4 ? 'normal' : 'faible';
    const final_priority = decl.president_override
      ? mapToLevel(decl.president_override)
      : computed_priority;

    let parsedIssues = [];
    if (decl.ai_visible_issues) {
      try {
        parsedIssues = Array.isArray(decl.ai_visible_issues)
          ? decl.ai_visible_issues
          : JSON.parse(decl.ai_visible_issues);
      } catch (e) {
        parsedIssues = typeof decl.ai_visible_issues === 'string'
          ? [decl.ai_visible_issues]
          : [];
      }
    }

    const responseData = {
      id: decl.id,
      ai_priority: decl.ai_priority ? mapToLevel(decl.ai_priority) : 'normal',
      ai_priority_score: score_ai,
      ai_confidence: decl.ai_confidence ? (decl.ai_confidence > 1 ? decl.ai_confidence / 100 : decl.ai_confidence) : 0.8,
      ai_reasoning: decl.ai_reasoning || null,
      ai_visible_issues: parsedIssues,
      is_sensitive: !!decl.is_sensitive,
      sensitive_type: decl.sensitive_type || null,
      sensitive_distance_m: decl.is_sensitive ? 120 : null,
      votes_count: decl.votes_count || 0,
      computed_priority,
      computed_score,
      final_priority,
      president_override: decl.president_override ? mapToLevel(decl.president_override) : null,
      president_override_note: decl.president_override_note || null,
      priority_approved: !!decl.priority_approved,
      priority_approved_at: decl.priority_approved_at || null,
      approved_by_name: decl.priority_approved ? 'Président' : null,
      score_ai,
      score_votes,
      score_location,
      score_total,
    };

    return res.json(responseData);
  } catch (err) {
    console.error('[Declarations] getPriorityDetail error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
const VALID_PRIORITY_LABELS = ['low', 'medium', 'high', 'urgent'];
 
function sanitizePriorityLabel(raw) {
  if (!raw) return 'low';
  const lo = String(raw).toLowerCase().trim();
 
  // Map common variants to valid enum values
  const MAP = {
    'faible':  'low',
    'basse':   'low',
    'low':     'low',
    'normal':  'medium',
    'normale': 'medium',
    'moyen':   'medium',
    'moyenne': 'medium',
    'modere':  'medium',
    'modéré':  'medium',
    'medium':  'medium',
    'haute':   'high',
    'high':    'high',
    'élevé':   'high',
    'eleve':   'high',
    'urgent':  'urgent',
    'urgente': 'urgent',
    'critique':'urgent',
  };
 
  return MAP[lo] || (VALID_PRIORITY_LABELS.includes(lo) ? lo : 'low');
}
 
exports.sanitizePriorityLabel = sanitizePriorityLabel;