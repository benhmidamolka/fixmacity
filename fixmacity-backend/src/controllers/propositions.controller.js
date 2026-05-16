'use strict';

const supabase = require('../config/db');
const { validationResult } = require('express-validator');

/* ──────────── POST /api/propositions ──────────── */
exports.createProposition = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ error: 'Un titre valide (3 caractères min) est requis pour votre suggestion.' });
    }

    const { data: proposition, error } = await supabase.from('propositions').insert({
      title: title.trim(),
      description: description ? description.trim() : null,
      created_by: req.user.id,
      status: 'active'
    }).select('*').single();

    if (error) {
      console.error('[Propositions] DB Error:', error);
      return res.status(500).json({ error: 'Erreur lors de la création de la suggestion.' });
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
    // All roles can see propositions (they are public for voting)
    // However, we might want to restrict non-president/citizen from taking actions, but viewing is fine.
    if (!['citizen', 'president'].includes(req.user.role)) {
      // Other roles (agents/chefs) might see them too if we want, but let's keep it open or restricted as needed.
    }

    let { data: propositions, error } = await query
      .order('created_at', { ascending: false });

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
      
      propositions = propositions.map(p => ({
        ...p,
        users: userMap[p.created_by] || null
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
      .select('status, start_date, end_date')
      .eq('id', id)
      .single();

    if (!proposition) return res.status(404).json({ error: 'Proposition introuvable.' });
    if (proposition.status !== 'active') return res.status(400).json({ error: 'Cette proposition est clôturée.' });

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
