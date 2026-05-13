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
    // Citizens see only their own suggestions.
    // President sees all suggestions.
    if (req.user.role === 'citizen') {
      query = query.eq('created_by', req.user.id);
    } else if (req.user.role !== 'president') {
      // Other roles (agents/chefs) shouldn't really see these per requirement, but we'll enforce privacy.
      return res.status(403).json({ error: 'Accès non autorisé.' });
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
        .select('id, first_name, last_name')
        .in('id', userIds);
      
      const userMap = {};
      if (usersData) {
        usersData.forEach(u => userMap[u.id] = { first_name: u.first_name, last_name: u.last_name });
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
      .select('status')
      .eq('id', id)
      .single();

    if (!proposition) return res.status(404).json({ error: 'Proposition introuvable.' });
    if (proposition.status !== 'active') return res.status(400).json({ error: 'Cette proposition est clôturée.' });

    // Upsert equivalent: check if exists, then update or insert
    const { data: existing } = await supabase.from('proposition_votes')
      .select('id')
      .eq('proposition_id', id)
      .eq('citizen_id', req.user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('proposition_votes')
        .update({ vote, voted_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return res.status(500).json({ error: 'Erreur lors de la mise à jour du vote.' });
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
exports.respondToProposition = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, president_response } = req.body;

    const validStatuses = ['a_discuter', 'retenu', 'refuse'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }

    const { data: updated, error } = await supabase
      .from('propositions')
      .update({
        status,
        president_response,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[Propositions] Respond error:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la réponse.' });
    }

    return res.status(200).json({ message: 'Réponse enregistrée avec succès.', suggestion: updated });
  } catch (err) {
    console.error('[Propositions] Server error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
