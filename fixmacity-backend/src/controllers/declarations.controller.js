'use strict';

const supabase = require('../config/db');
const { validationResult } = require('express-validator');
const { generateRefCitoyen } = require('../services/refGenerator.service');
const { logStatusChange } = require('../services/statusHistory.service');
const { notifyNewDeclaration } = require('../services/notification.service');

// ── Citizen-facing status map ─────────────────────────────────
const CITIZEN_STATUS_MAP = {
  soumise: 'EN ATTENTE',
  assignee_chef: 'EN ATTENTE',
  assignee_agent: 'EN ATTENTE',
  refusee_chef: 'EN ATTENTE',
  refusee_agent: 'EN ATTENTE',
  en_cours: 'EN COURS',
  resolue: 'TERMINE',
  cloturee: 'TERMINE',
};

function mapCitizenStatus(decl) {
  return { ...decl, citizen_status: CITIZEN_STATUS_MAP[decl.status] || decl.status };
}

/* ──────────── POST /api/declarations ──────────── */
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, category, delegation_id, latitude, longitude, address } = req.body;
    const resolvedDelegationId = delegation_id || req.user.delegation_id;

    const refCitoyen = await generateRefCitoyen(resolvedDelegationId);

    const { data: decl, error } = await supabase
      .from('declarations')
      .insert({
        title: title.trim(),
        description: description.trim(),
        category,
        delegation_id: resolvedDelegationId,
        citizen_id: req.user.id,    // canonical PRD column
        user_id: req.user.id,    // kept for FK join in some queries
        ref_citoyen: refCitoyen,
        status: 'soumise',
        latitude: latitude || null,
        longitude: longitude || null,
        address: address || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Declarations] Create error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la soumission.' });
    }

    await logStatusChange(decl.id, null, 'soumise', req.user.id);
    await notifyNewDeclaration(req.app, decl).catch(() => { });

    return res.status(201).json({ declaration: mapCitizenStatus(decl) });
  } catch (err) {
    console.error('[Declarations] Create error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/declarations/mine ──────────── */
exports.mine = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('v_declarations_citizen')
      .select('*')
      .eq('citizen_id', req.user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(200).json({ declarations: data });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/declarations/map ──────────── */
exports.map = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('v_map_declarations')
      .select('*');

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(200).json({ declarations: data });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/declarations/nearby ──────────── */
exports.nearby = async (req, res) => {
  try {
    const { latitude, longitude, category } = req.query;

    if (!latitude || !longitude || !category) {
      return res.status(400).json({ error: 'latitude, longitude et category sont requis.' });
    }

    const { data, error } = await supabase.rpc('get_nearby_declarations', {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
      radius: 200,
      p_category: category,
    });

    if (error) {
      console.warn('[Declarations] Nearby RPC error:', error.message);
      return res.status(200).json({ declarations: [], proximity_check: false });
    }

    return res.status(200).json({ declarations: data || [], proximity_check: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/declarations (all, for staff/map list) ──────────── */
exports.getAll = async (req, res) => {
  try {
    const { delegation_id, department_id, status, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('declarations')
      .select('id, title, description, category, status, latitude, longitude, address, delegation_id, department_id, created_at, votes_count, ref_citoyen, ref_service', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (delegation_id) query = query.eq('delegation_id', delegation_id);
    if (department_id) query = query.eq('department_id', department_id);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: 'Erreur serveur.' });

    return res.status(200).json({ declarations: data, total: count, page: +page, limit: +limit });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/declarations/:id ──────────── */
exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: decl, error } = await supabase
      .from('declarations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !decl) return res.status(404).json({ error: 'Déclaration introuvable.' });

    // Citizens can only view their own declarations
    if (req.user.role === 'citizen' && decl.citizen_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    // Fetch relations manually since db.js shim strips embeds
    const [photosRes, commentsRes, historyRes, ratingsRes] = await Promise.all([
      supabase.from('declaration_photos').select('*').eq('declaration_id', id),
      supabase.from('internal_comments').select('*').eq('declaration_id', id).order('created_at', { ascending: true }),
      supabase.from('status_history').select('*').eq('declaration_id', id).order('created_at', { ascending: true }),
      supabase.from('ratings').select('score, comment').eq('declaration_id', id)
    ]);

    decl.declaration_photos = photosRes.data || [];
    decl.internal_comments = commentsRes.data || [];
    decl.status_history = historyRes.data || [];
    decl.ratings = ratingsRes.data || [];

    // Fetch user details for comments and history
    const userIds = new Set();
    decl.internal_comments.forEach(c => userIds.add(c.user_id));
    decl.status_history.forEach(h => { if (h.changed_by) userIds.add(h.changed_by); });

    if (userIds.size > 0) {
      const { data: users } = await supabase.from('users').select('id, first_name, last_name, role').in('id', Array.from(userIds));
      const userMap = {};
      (users || []).forEach(u => userMap[u.id] = u);

      decl.internal_comments.forEach(c => c.users = userMap[c.user_id] || null);
      decl.status_history.forEach(h => h.users = userMap[h.changed_by] || null);
    }

    const declaration = req.user.role === 'citizen' ? mapCitizenStatus(decl) : decl;
    return res.status(200).json({ declaration });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PUT /api/declarations/:id ──────────── */
exports.update = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;

    const { data: existing } = await supabase
      .from('declarations')
      .select('id, citizen_id, status')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!existing) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (existing.citizen_id !== req.user.id)
      return res.status(403).json({ error: 'Modification non autorisée.' });
    if (existing.status !== 'soumise')
      return res.status(403).json({ error: "Modification impossible après soumission." });

    const { title, description, category, latitude, longitude, address } = req.body;
    const updates = {};
    if (title) updates.title = title.trim();
    if (description) updates.description = description.trim();
    if (category) updates.category = category;
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;
    if (address) updates.address = address;

    const { data: updated, error } = await supabase
      .from('declarations')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(200).json({ declaration: mapCitizenStatus(updated) });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── DELETE /api/declarations/:id ──────────── */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('declarations')
      .select('id, citizen_id, status')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!existing) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (existing.citizen_id !== req.user.id)
      return res.status(403).json({ error: 'Suppression non autorisée.' });
    if (existing.status !== 'soumise')
      return res.status(403).json({ error: "Suppression impossible après soumission." });

    const { error } = await supabase
      .from('declarations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(200).json({ message: 'Déclaration supprimée.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/declarations/:id/vote ──────────── */
exports.vote = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: decl } = await supabase
      .from('declarations')
      .select('id, citizen_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.citizen_id === req.user.id)
      return res.status(400).json({ error: 'Vous ne pouvez pas voter sur votre propre déclaration.' });

    // Pre-check (DB UNIQUE also enforces this as the final safety net)
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('declaration_id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existingVote)
      return res.status(409).json({ error: 'Vous avez déjà voté pour cette déclaration.' });

    const { error: insertErr } = await supabase
      .from('votes')
      .insert({
        declaration_id: id,
        user_id: req.user.id,
        vote: 'pour',   // declarations = simple upvote, always 'pour'
      });

    if (insertErr) {
      if (insertErr.code === '23505')
        return res.status(409).json({ error: 'Vote déjà enregistré.' });
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    await supabase.rpc('increment_vote_count', { p_declaration_id: id });
    return res.status(201).json({ message: 'Vote enregistré.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/declarations/:id/rate ──────────── */
exports.rate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { comment } = req.body;

    // Accept both field names: `rating` (documented in API) or `score` (DB column name)
    const score = req.body.score ?? req.body.rating;
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Note invalide — doit être entre 1 et 5.' });
    }

    const { data: decl } = await supabase
      .from('declarations')
      .select('id, citizen_id, status')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!decl) return res.status(404).json({ error: 'Déclaration introuvable.' });
    if (decl.citizen_id !== req.user.id)
      return res.status(403).json({ error: 'Évaluation non autorisée.' });
    if (!['resolue', 'cloturee'].includes(decl.status))
      return res.status(403).json({ error: 'Évaluation uniquement possible après résolution.' });

    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('declaration_id', id)
      .maybeSingle();

    if (existingRating)
      return res.status(409).json({ error: 'Vous avez déjà évalué cette déclaration.' });

    const { error } = await supabase.from('ratings').insert({
      declaration_id: id,
      citizen_id: req.user.id,
      score,                        // DB column is `score` not `rating`
      comment: comment?.trim() || null,
    });

    if (error) return res.status(500).json({ error: 'Erreur serveur.' });
    return res.status(201).json({ message: 'Évaluation enregistrée. Merci !' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/declarations/check-duplicate ──────────── */
exports.checkDuplicate = async (req, res) => {
  try {
    const { lat, lng, category } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'lat et lng sont requis.' });

    const { data: nearby, error } = await supabase.rpc('get_nearby_declarations', {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: 50,
      p_category: category || '',
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ duplicates: nearby || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
