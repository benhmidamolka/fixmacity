'use strict';

const supabase = require('../config/db');
const { validationResult } = require('express-validator');

/* ──────────── POST /api/propositions ──────────── */
exports.createProposition = async (req, res) => {
  try {
    const { title, description, category, location } = req.body;

    // ── Required field validation (fail-fast, ordered) ──
    const REQUIRED = [
      { key: 'title',       val: title,       label: 'Titre' },
      { key: 'description', val: description, label: 'Description' },
      { key: 'category',    val: category,    label: 'Catégorie' },
    ];
    for (const { key, val, label } of REQUIRED) {
      if (!val || !String(val).trim()) {
        return res.status(400).json({ error: `Le champ '${label}' est obligatoire.`, field: key });
      }
    }
    if (String(title).trim().length < 3) {
      return res.status(400).json({ error: 'Le titre doit contenir au moins 3 caractères.', field: 'title' });
    }

    const { data: proposition, error } = await supabase.from('propositions').insert({
      title:       String(title).trim(),
      description: String(description).trim(),
      category:    String(category).trim(),
      location:    location ? String(location).trim() : null,
      type:        'citizen',
      created_by:  req.user.id,
      status:      'active',
    }).select('*').single();

    if (error) {
      console.error('[Propositions] DB Error:', error);
      return res.status(500).json({ error: 'Erreur lors de la création de la suggestion.' });
    }

    // Notify présidents
    try {
      const { data: presidents } = await supabase.from('users').select('id').eq('role', 'president').eq('is_active', true);
      if (presidents && presidents.length > 0) {
        const citizenName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Un citoyen';
        const notifications = presidents.map(p => ({
          user_id: p.id,
          type: 'new_proposition',
          title: 'Nouvelle suggestion citoyenne',
          body: `${citizenName} a soumis une suggestion : « ${proposition.title} »`,
          reference_id: proposition.id,
          is_read: false,
          created_at: new Date().toISOString()
        }));
        await supabase.from('notifications').insert(notifications);
      }
    } catch (notifErr) {
      console.warn('[Propositions] President notification error:', notifErr.message);
    }

    return res.status(201).json({ proposition });
  } catch (err) {
    console.error('[Propositions] Create error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/propositions ──────────── */
exports.listPropositions = async (req, res) => {
  try {
    let query = supabase.from('propositions').select('*');

    // Visibility rules:
    // - president: sees everything (all types, all statuses)
    // - citizen: sees type='president' AND status='active' (votable only)
    //            PLUS their own type='citizen' suggestions (for tracking, any status)
    if (req.user.role === 'citizen') {
    query = query.or(`type.eq.president,type.eq.municipal,created_by.eq.${req.user.id}`);
    }
    // president role: no filter applied — sees all rows

    let { data: propositions, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Propositions] List error:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement des suggestions.' });
    }

    if (propositions && propositions.length > 0) {
      const userIds = [...new Set(propositions.map(p => p.created_by))];
      const { data: usersData } = await supabase.from('users')
        .select('id, first_name, last_name, email, role')
        .in('id', userIds);
      
      const userMap = {};
      if (usersData) {
        usersData.forEach(u => userMap[u.id] = { first_name: u.first_name, last_name: u.last_name, email: u.email, role: u.role });
      }
      
      let userVotesMap = {};
      if (req.user && req.user.id) {
        const { data: userVotes } = await supabase.from('proposition_votes')
          .select('proposition_id, vote')
          .eq('citizen_id', req.user.id)
          .in('proposition_id', propositions.map(p => p.id));
        if (userVotes) {
          userVotes.forEach(v => userVotesMap[v.proposition_id] = v.vote);
        }
      }

      propositions = propositions.map(p => ({
        ...p,
        users: userMap[p.created_by] || null,
        user_vote: userVotesMap[p.id] || null
      }));
    }

    return res.status(200).json({ propositions: propositions || [] });
  } catch (err) {
    console.error('[Propositions] Catch error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/propositions/:id/vote ──────────── */
exports.voteProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body; // 'pour' or 'contre'

    if (!['pour', 'contre'].includes(vote)) {
      return res.status(400).json({ error: 'Vote invalide (doit être "pour" ou "contre").' });
    }

    const { data: proposition } = await supabase.from('propositions')
      .select('status, start_date, end_date, created_by')
      .eq('id', id)
      .single();

    if (!proposition) return res.status(404).json({ error: 'Proposition introuvable.' });
    if (proposition.status !== 'active') return res.status(400).json({ error: 'Cette proposition est clôturée.' });

    // ── Self-vote guard ──────────────────────────────────────────────────────
    if (proposition.created_by === req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas voter sur votre propre proposition.' });
    }

    const now = new Date();
    const startDate = proposition.start_date ? new Date(proposition.start_date) : null;
    const endDate = proposition.end_date ? new Date(proposition.end_date) : null;

    if (startDate && now < startDate) {
      return res.status(400).json({ error: 'La période de vote n\'a pas encore commencé.' });
    }
    if (endDate && now > endDate) {
      return res.status(400).json({ error: 'La période de vote est terminée.' });
    }


    // Upsert equivalent: check if exists, then update or insert
    const { data: existing } = await supabase.from('proposition_votes')
      .select('id, voted_at')
      .eq('proposition_id', id)
      .eq('citizen_id', req.user.id)
      .maybeSingle();

    if (existing) {
      const voteDate = new Date(existing.voted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      return res.status(400).json({ error: `Vous avez déjà voté pour cette proposition le ${voteDate}.` });
    } else {
      const { error } = await supabase.from('proposition_votes')
        .insert({
          proposition_id: id,
          citizen_id: req.user.id,
          vote
        });
      if (error) return res.status(500).json({ error: 'Erreur lors du vote.' });
    }

    // Due to the database trigger `sync_proposition_vote_counts()`,
    // the counts on the `propositions` table are automatically updated.
    const { data: updatedProp } = await supabase.from('propositions').select('*').eq('id', id).single();

    return res.status(200).json({ message: 'A voté avec succès', proposition: updatedProp });
  } catch (err) {
    console.error('[Propositions] Vote error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/propositions/:id/respond ──────────── */
// NOTE: The DB proposition_status enum only contains 'active' and 'closed'.
// The president's decision ('a_discuter' | 'retenu' | 'refuse') is stored
// as text in the president_response column. The DB status becomes:
//   - 'active'  → a_discuter (still open for discussion)
//   - 'closed'  → retenu or refuse (final decision)
exports.respondToProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: decision, president_response } = req.body;

    const validDecisions = ['a_discuter', 'confirme', 'retenu', 'refuse'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ error: 'Décision invalide. Valeurs acceptées: a_discuter, confirme, retenu, refuse.' });
    }

    // Map decision to DB-compatible status enum
    const dbStatus = (decision === 'a_discuter' || decision === 'confirme') ? 'active' : 'closed';

    const { data: updated, error } = await supabase
      .from('propositions')
      .update({
        status: dbStatus,
        president_response: president_response
          ? `[${decision.toUpperCase()}] ${president_response}`
          : `[${decision.toUpperCase()}]`,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[Propositions] Respond error:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la réponse.' });
    }

    return res.status(200).json({
      message: 'Réponse enregistrée avec succès.',
      decision,
      suggestion: updated
    });
  } catch (err) {
    console.error('[Propositions] Server error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/propositions/:id/summary ──────────── */
exports.getPropositionSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.rpc('get_proposition_summary', { p_proposition_id: id });

    if (error) {
      console.error('[Propositions] Summary error:', error);
      return res.status(500).json({ error: 'Erreur lors de la récupération du résumé.' });
    }

    return res.status(200).json({ success: true, summary: data[0] || null });
  } catch (err) {
    console.error('[Propositions] Catch error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── PATCH /api/propositions/:id/decide ──────────── */
// President decides on a citizen-type suggestion: Confirmer or Retenu
exports.decideProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    const VALID = ['Confirmer', 'Retenu'];
    if (!VALID.includes(decision)) {
      return res.status(400).json({
        error: `Décision invalide. Valeurs acceptées : ${VALID.join(', ')}.`,
      });
    }

    // Fetch the proposition
    const { data: prop, error: fetchErr } = await supabase
      .from('propositions')
      .select('id, title, status, type, created_by')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !prop) {
      return res.status(404).json({ error: 'Suggestion introuvable.' });
    }

    // Only citizen-type suggestions in active/a_discuter status are decidable
    if (prop.type !== 'citizen') {
      return res.status(400).json({ error: 'Action non autorisée : seules les suggestions citoyennes peuvent être décidées.' });
    }
    const decidableStatuses = ['active', 'a_discuter'];
    if (!decidableStatuses.includes(prop.status)) {
      return res.status(400).json({ error: 'Action non autorisée pour le statut actuel.' });
    }

    // Persist the decision
    const { data: updated, error: updateErr } = await supabase
      .from('propositions')
      .update({
        status:     decision,          // 'Confirmer' or 'Retenu'
        decided_at: new Date().toISOString(),
        decided_by: req.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[Propositions] Decide update error:', updateErr);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la décision.' });
    }

    // Notify the citizen (non-blocking)
    const decisionLabel = decision === 'Confirmer' ? 'Confirmée' : 'Retenue';
    const { notify, TYPES } = require('../services/notification.service');
    if (prop.created_by) {
      notify(req.app, {
        userId: prop.created_by,
        type:   TYPES.STATUS_CHANGE,
        title:  `Votre suggestion a été ${decisionLabel} par le Président`,
        body:   `Votre suggestion « ${prop.title} » a été ${decisionLabel} par le Président de la municipalité.`,
      }).catch(e => console.warn('[Propositions] Notify error:', e.message));
    }

    return res.status(200).json({
      message:    `Suggestion ${decisionLabel} avec succès.`,
      decision,
      suggestion: updated,
    });
  } catch (err) {
    console.error('[Propositions] Decide error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── POST /api/propositions/:id/confirmer ──────────── */
exports.confirmProposition = async (req, res) => {
  req.body.decision = 'Confirmer';
  return exports.decideProposition(req, res);
};

/* ──────────── POST /api/propositions/:id/retenu ──────────── */
exports.retainProposition = async (req, res) => {
  req.body.decision = 'Retenu';
  return exports.decideProposition(req, res);
};

/* ──────────── PUT /api/propositions/:id ──────────── */
// President edits their own type='president' proposition
exports.updateProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, end_date, start_date, status } = req.body;

    // Fetch existing
    const { data: prop, error: fetchErr } = await supabase
      .from('propositions')
      .select('id, type, created_by')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !prop) {
      return res.status(404).json({ error: 'Proposition introuvable.' });
    }
    if (prop.type !== 'president') {
      return res.status(403).json({ error: 'Seules les propositions présidentielles peuvent être modifiées.' });
    }
    if (prop.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres propositions.' });
    }

    // ── Optional photo upload ───────────────────────────────────
    let publicUrl = null;
    if (req.file) {
      const path = require('path');
      const fs   = require('fs');
      const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const ext      = path.extname(req.file.originalname) || '.jpg';
      const filename = `prop_${req.user.id}_${Date.now()}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5005}`;
      publicUrl = `${baseUrl}/uploads/${filename}`;
    }

    const updates = { updated_at: new Date().toISOString() };
    if (title)       updates.title       = String(title).trim();
    if (description) updates.description = String(description).trim();
    if (category)    updates.category    = String(category).trim();
    if (end_date)    updates.end_date    = end_date;
    if (start_date)  updates.start_date  = start_date;
    if (status && ['active', 'closed', 'draft'].includes(status)) updates.status = status;
    if (publicUrl)   updates.image_url   = publicUrl;

    const { data: updated, error: updateErr } = await supabase
      .from('propositions')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[Propositions] Update error:', updateErr);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }

    return res.status(200).json({ message: 'Proposition mise à jour.', proposition: updated });
  } catch (err) {
    console.error('[Propositions] Update error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── DELETE /api/propositions/:id ──────────── */
// President deletes their own type='president' proposition
exports.deleteProposition = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: prop, error: fetchErr } = await supabase
      .from('propositions')
      .select('id, type, created_by')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !prop) {
      return res.status(404).json({ error: 'Proposition introuvable.' });
    }
    if (prop.type !== 'president') {
      return res.status(403).json({ error: 'Seules les propositions présidentielles peuvent être supprimées.' });
    }
    if (prop.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres propositions.' });
    }

    const { error: delErr } = await supabase
      .from('propositions')
      .delete()
      .eq('id', id);

    if (delErr) {
      console.error('[Propositions] Delete error:', delErr);
      return res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }

    return res.status(200).json({ message: 'Proposition supprimée.' });
  } catch (err) {
    console.error('[Propositions] Delete error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
