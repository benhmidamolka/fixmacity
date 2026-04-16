'use strict';

const supabase = require('../config/db');
const { validationResult } = require('express-validator');

/* ──────────── POST /api/propositions ──────────── */
exports.createProposition = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, start_date, end_date } = req.body;

    const { data: proposition, error } = await supabase.from('propositions').insert({
      title: title.trim(),
      description: description ? description.trim() : null,
      start_date,
      end_date,
      created_by: req.user.id,
      status: 'active'
    }).select('*').single();

    if (error) return res.status(500).json({ error: 'Erreur lors de la création de la proposition.' });
    return res.status(201).json({ proposition });
  } catch (err) {
    console.error('[Propositions] Create error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────── GET /api/propositions ──────────── */
exports.listPropositions = async (req, res) => {
  try {
    // Close expired ones automatically before fetching
    await supabase.rpc('close_expired_propositions').catch(() => {});

    // Fetch active/closed propositions
    const { data: propositions, error } = await supabase.from('propositions')
      .select('*')
      .in('status', ['active', 'closed'])
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Erreur lors du chargement des propositions.' });

    // Attach user vote if it exists
    if (propositions && propositions.length > 0) {
      const propIds = propositions.map(p => p.id);
      const { data: myVotes } = await supabase.from('proposition_votes')
        .select('proposition_id, vote')
        .eq('citizen_id', req.user.id)
        .in('proposition_id', propIds);
      
      const voteMap = {};
      (myVotes || []).forEach(v => { voteMap[v.proposition_id] = v.vote; });
      propositions.forEach(p => { p.my_vote = voteMap[p.id] || null; });
    }

    return res.status(200).json({ propositions: propositions || [] });
  } catch (err) {
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
