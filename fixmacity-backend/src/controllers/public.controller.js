'use strict';

const supabase = require('../config/db');

exports.getPublicDeclarations = async (req, res) => {
  try {
    const { data: declarations, error } = await supabase.from('declarations')
      .select('id, latitude, longitude, status, created_at, resolved_at')
      .is('deleted_at', null);

    if (error) throw error;

    return res.status(200).json({ declarations: declarations || [] });
  } catch (err) {
    console.error('[Public Controller - getPublicDeclarations]', err.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

exports.getDeclarationFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch ratings/comments for the specific declaration
    const { data: comments, error } = await supabase.from('ratings')
      .select('score, comment, rated_at')
      .eq('declaration_id', id);

    if (error) throw error;

    if (!comments || comments.length === 0) {
      return res.status(200).json({ average_score: null, feedback: [] });
    }

    // Filter out rows without a score
    const scoredComments = comments.filter(c => c.score != null);
    
    let average_score = null;
    if (scoredComments.length > 0) {
      const totalScore = scoredComments.reduce((acc, curr) => acc + curr.score, 0);
      average_score = parseFloat((totalScore / scoredComments.length).toFixed(1));
    }

    // Optional: filter out empty comments to keep payload sizes small
    const feedback = comments
      .filter(c => c.comment && c.comment.trim() !== '')
      .map(c => ({
        score: c.score,
        comment: c.comment,
        reviewed_at: c.rated_at
      }));

    return res.status(200).json({ average_score, feedback });
  } catch (err) {
    console.error('[Public Controller - getDeclarationFeedback]', err.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
