const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { generateRefCitoyen } = require('../services/refGenerator.service');
const { logStatusChange } = require('../services/statusHistory.service');
const { notifyNewDeclaration } = require('../services/notification.service');
'use strict';
 
const path    = require('path');
const fs      = require('fs');
const supabase = require('../config/db');
const { validationResult }    = require('express-validator');
const { logStatusChange }     = require('../services/statusHistory.service');
const { notifyNewDeclaration }= require('../services/notification.service');
 
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
 
async function generateRefCitoyen(code) {
  const { generateRefCitoyen: gen } = require('../services/refGenerator.service');
  return gen(code);
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
/* ── Helper: map DB enum statuses → citizen-facing statuses ── */
const CITIZEN_STATUS_MAP = {
  soumise:        'SOUMISE',
  assignee_chef:  'EN COURS',
  assignee_agent: 'EN COURS',
  refusee_chef:   'SOUMISE',
  refusee_agent:  'EN COURS',
  en_cours:       'EN COURS',
  resolue:        'ÉVALUÉ',
  cloturee:       'CLÔTURÉ',
};

function mapCitizenStatus(decl) {
  return {
    ...decl,
    citizen_status: CITIZEN_STATUS_MAP[decl.status] || decl.status,
  };
}

const fs = require('fs');
const path = require('path');
const { getNextGenAI } = require('../services/gemini.rotation');

/* ──────────── POST /api/declarations ──────────── */
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, delegation_id, latitude, longitude, address, has_critical_infrastructure, sensitive_type: citizenSensitiveType } = req.body;

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
    let is_sensitive = has_critical_infrastructure === 'true' || has_critical_infrastructure === true;
    let sensitive_type = is_sensitive ? (citizenSensitiveType || 'signalé par citoyen') : null;
    
    if (req.file) {
      // --- AI Validation (Image + Text) ---
      try {
        const genAI = getNextGenAI();
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        });
        
        const prompt = `Tu es un assistant d'analyse pour une municipalité.
        Voici la description fournie par le citoyen : "${description || 'Aucune description'}".
        
        Tâche 1 : Vérifier si l'image et la description sont pertinentes. Elles doivent montrer ou décrire un problème urbain ou municipal qui relève de la compétence d'une mairie/municipalité (ex: nid-de-poule, déchets, fuite d'eau, éclairage public cassé, trottoir endommagé, etc.). Si l'image est un selfie, un meme, un spam, un écran d'ordinateur, ou un sujet personnel/privé n'ayant rien à voir avec les services municipaux, c'est NON pertinent.
        Tâche 2 : Vérifier s'il y a des infrastructures critiques/sensibles à proximité immédiate ou mentionnées dans le signalement. S'agit-il d'une école, d'un lycée, d'une université, d'un hôpital, d'une clinique, d'un centre de santé, d'une mosquée, ou d'une administration publique ? Sois très spécifique.
        
        Réponds strictement avec ce format JSON :
        {
          "is_relevant": boolean,
          "critical_infrastructure_nearby": boolean,
          "infrastructure_type": "école/université" | "hôpital/clinique" | "mosquée" | "administration publique" | "autre" | null,
          "reason": "Explication claire en français du rejet ou de la validation"
        }`;
        
        const imagePart = {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype
          }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const analysis = JSON.parse(result.response.text());

        if (analysis.is_relevant === false) {
          return res.status(400).json({ error: "Rejet automatique : Ce signalement ne concerne pas un problème urbain ou municipal. " + analysis.reason });
        }

        if (analysis.critical_infrastructure_nearby) {
          is_sensitive = true;
          sensitive_type = analysis.infrastructure_type || sensitive_type || 'critique';
        }
      } catch (aiError) {
        console.error('[Gemini] Erreur lors de l\'analyse de l\'image :', aiError.message);
        // We do not block the submission if the AI service temporarily fails
      }

      // --- File Saving ---
      const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `citoyen_${req.user.id}_${Date.now()}${ext}`;
      const destPath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(destPath, req.file.buffer);

      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5005}`;
      publicUrl = `${baseUrl}/uploads/${filename}`;
    } else if (description) {
      // --- AI Validation (Text Only) ---
      try {
        const genAI = getNextGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
        const prompt = `Tu es un assistant d'analyse pour une municipalité.
        Voici la description fournie par le citoyen : "${description}".
        
        Tâche 1 : Vérifier si la description est pertinente. Elle doit décrire un problème urbain ou municipal (ex: nid-de-poule, déchets sauvages, fuite d'eau, éclairage public en panne, trottoir endommagé, etc.). Si la description est hors sujet, un spam, un meme, ou n'a aucun rapport avec la municipalité, c'est NON pertinent.
        Tâche 2 : Vérifier s'il y a des infrastructures critiques/sensibles mentionnées (école, université, hôpital, clinique, mosquée, administration publique). Sois très spécifique.
        
        Réponds strictement avec ce format JSON :
        {
          "is_relevant": boolean,
          "critical_infrastructure_nearby": boolean,
          "infrastructure_type": "école/université" | "hôpital/clinique" | "mosquée" | "administration publique" | "autre" | null,
          "reason": "Explication claire en français du rejet ou de la validation"
        }`;
        
        const result = await model.generateContent([prompt]);
        const analysis = JSON.parse(result.response.text());
        
        if (analysis.is_relevant === false) {
          return res.status(400).json({ error: "Rejet automatique : Ce signalement ne concerne pas un problème urbain ou municipal. " + analysis.reason });
        }

        if (analysis.critical_infrastructure_nearby) {
          is_sensitive = true;
          sensitive_type = analysis.infrastructure_type || sensitive_type || 'critique';
        }
      } catch (aiErr) {
        console.error('[Gemini text] Erreur:', aiErr.message);
      }
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
        is_sensitive:  is_sensitive,
        sensitive_type: sensitive_type,
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
    const { page = 1, limit = 10 } = req.query;
    const limitNum = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * limitNum;

    const { pool } = require('../config/db');
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
  // ============================================================
// PATCH for declarations.controller.js
// Add/replace these exports in your existing controller
// ============================================================

const { supabase } = require('../config/supabase');

// ── HELPER: detect sensitive location via DB function ────────────────
async function detectSensitiveLocation(lat, lng) {
  if (!lat || !lng) return { nearby: false };
  const { data, error } = await supabase.rpc('is_near_sensitive_location', {
    p_lat: parseFloat(lat),
    p_lng: parseFloat(lng),
  });
  if (error || !data) return { nearby: false };
  // RPC returns array of rows from OUT params
  const row = Array.isArray(data) ? data[0] : data;
  return {
    nearby:        row.nearby        ?? false,
    location_type: row.location_type ?? null,
    location_name: row.location_name ?? null,
    distance_m:    row.distance_m    ?? null,
    bonus:         row.bonus         ?? 0,
  };
}

// ── CREATE DECLARATION (replace exports.create) ──────────────────────
exports.create = async (req, res) => {
  try {
    const citizenId = req.user?.id;
    if (!citizenId) return res.status(401).json({ error: 'Non authentifié' });

    const {
      title, description, type_probleme, address,
      latitude, longitude, service_id, photo_avant_url,
      delegation_id, category,
      // AI fields from citizen frontend (optional)
      ai_priority        = 'normal',
      ai_priority_score  = 5.0,
      ai_confidence      = 0.5,
      ai_reasoning       = null,
      ai_visible_issues  = null,
      used_ai_vision     = false,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Le titre est obligatoire' });
    }

    // Detect sensitive location server-side
    const locInfo = await detectSensitiveLocation(latitude, longitude);

    // Insert declaration — DB trigger will compute final priority
    const { data, error } = await supabase
      .from('declarations')
      .insert({
        citizen_id:        citizenId,
        title:             title.trim(),
        description:       description?.trim() ?? null,
        type_probleme:     type_probleme ?? null,
        address:           address ?? null,
        latitude:          latitude ? parseFloat(latitude) : null,
        longitude:         longitude ? parseFloat(longitude) : null,
        service_id:        service_id ?? null,
        photo_avant_url:   photo_avant_url ?? null,
        delegation_id:     delegation_id ?? null,
        category:          category ?? null,
        status:            'soumise',
        // AI fields
        ai_priority:       ai_priority,
        ai_priority_score: parseFloat(ai_priority_score) || 5.0,
        ai_confidence:     parseFloat(ai_confidence)     || 0.5,
        ai_reasoning:      ai_reasoning,
        ai_visible_issues: ai_visible_issues,
        // Location (trigger will also set these, but pass them explicitly)
        is_sensitive:      locInfo.nearby,
        sensitive_type:    locInfo.location_type,
      })
      .select(`
        *,
        services(name_fr, icon),
        users!declarations_citizen_id_fkey(first_name, last_name)
      `)
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data });

  } catch (err) {
    console.error('[declarations.create]', err);
    return res.status(500).json({ error: err.message ?? 'Erreur serveur' });
  }
};

// ── GET NEARBY SENSITIVE LOCATIONS ──────────────────────────────────
// Route: GET /declarations/nearby/sensitive?lat=...&lng=...
exports.getNearSensitiveLocations = async (req, res) => {
  try {
    const { lat, lng, radius = 1000 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat et lng sont requis' });
    }

    const { data, error } = await supabase
      .from('sensitive_locations')
      .select('id, name, type, latitude, longitude, address, bonus_score, radius_m')
      .eq('is_active', true);

    if (error) throw error;

    // Filter by distance client-side (or use PostGIS in prod)
    const lat_ = parseFloat(lat), lng_ = parseFloat(lng), r = parseFloat(radius);
    const nearby = (data ?? []).filter(loc => {
      const dist = haversineMeters(lat_, lng_, loc.latitude, loc.longitude);
      return dist <= r;
    }).map(loc => ({
      ...loc,
      distance_m: Math.round(haversineMeters(lat_, lng_, loc.latitude, loc.longitude)),
    })).sort((a, b) => a.distance_m - b.distance_m);

    return res.json({ data: nearby, count: nearby.length });
  } catch (err) {
    console.error('[getNearSensitiveLocations]', err);
    return res.status(500).json({ error: err.message });
  }
};

// ── PRESIDENT: APPROVE / OVERRIDE PRIORITY ──────────────────────────
// Route: POST /declarations/:id/priority
exports.approvePriority = async (req, res) => {
  try {
    const presidentId = req.user?.id;
    const { id } = req.params;
    const { override, note } = req.body;

    if (!presidentId) return res.status(401).json({ error: 'Non authentifié' });

    // Validate override value
    const VALID = ['faible', 'normal', 'urgent', null, undefined, ''];
    if (!VALID.includes(override)) {
      return res.status(400).json({ error: 'Valeur de priorité invalide' });
    }

    const { data, error } = await supabase.rpc('approve_priority', {
      p_declaration_id: id,
      p_override:       override || null,
      p_note:           note?.trim() || null,
      p_president_id:   presidentId,
    });

    if (error) throw error;
    return res.json({ success: true, data });

  } catch (err) {
    console.error('[approvePriority]', err);
    return res.status(500).json({ error: err.message });
  }
};

// ── GET DECLARATION PRIORITY DETAIL ─────────────────────────────────
// Route: GET /declarations/:id/priority
exports.getPriorityDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('v_declaration_priority')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Déclaration introuvable' });

    return res.json({ data });
  } catch (err) {
    console.error('[getPriorityDetail]', err);
    return res.status(500).json({ error: err.message });
  }
};

// ── Haversine helper ─────────────────────────────────────────────────
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── ADD TO declarations.routes.js ────────────────────────────────────
/*
  const ctrl = require('./declarations.controller');

  router.post('/',                          auth, ctrl.create);
  router.get('/nearby/sensitive',           ctrl.getNearSensitiveLocations);
  router.get('/:id/priority',              auth, ctrl.getPriorityDetail);
  router.post('/:id/priority',     presidentOnly, ctrl.approvePriority);
*/
};
