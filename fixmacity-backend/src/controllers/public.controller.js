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

exports.getPublicDelegations = async (req, res) => {
  try {
    const { data: delegations, error } = await supabase.from('delegations').select('*').order('name');
    if (error) throw error;
    return res.status(200).json({ delegations: delegations || [] });
  } catch (err) {
    console.error('[Public Controller - getPublicDelegations]', err.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

exports.getInterventions = async (req, res) => {
  try {
    // Step 1: fetch resolved declarations
    const { data: declarations, error } = await supabase
      .from('declarations')
      .select('id, title, category, address, resolved_at, votes_count, service_id')
      .in('status', ['resolue', 'cloturee'])
      .eq('is_deleted', false)
      .order('resolved_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    if (!declarations || declarations.length === 0) {
      return res.status(200).json({ interventions: [] });
    }

    const ids = declarations.map(d => d.id);
    const serviceIds = [...new Set(declarations.map(d => d.service_id).filter(Boolean))];

    // Step 2: fetch after-photos
    const { data: photos } = await supabase
      .from('declaration_photos')
      .select('declaration_id, url, photo_type')
      .in('declaration_id', ids)
      .eq('photo_type', 'after');

    // Step 3: fetch ratings
    const { data: ratings } = await supabase
      .from('ratings')
      .select('declaration_id, score, comment')
      .in('declaration_id', ids);

    // Step 4: fetch service names
    const { data: services } = serviceIds.length > 0
      ? await supabase.from('services').select('id, name_fr').in('id', serviceIds)
      : { data: [] };

    // Build lookup maps
    const photoMap = {};
    (photos || []).forEach(p => { if (!photoMap[p.declaration_id]) photoMap[p.declaration_id] = p.url; });
    const ratingMap = {};
    (ratings || []).forEach(r => { ratingMap[r.declaration_id] = { score: r.score, comment: r.comment }; });
    const serviceMap = {};
    (services || []).forEach(s => { serviceMap[s.id] = s.name_fr; });

    const formatted = declarations.map(d => ({
      id: d.id,
      title: d.title,
      category: d.category,
      address: d.address,
      resolved_at: d.resolved_at,
      votes_count: d.votes_count,
      service_name: d.service_id ? serviceMap[d.service_id] || null : null,
      rating: ratingMap[d.id] || null,
      after_img: photoMap[d.id] || null,
    }));

    return res.status(200).json({ interventions: formatted });
  } catch (err) {
    console.error('[Public Controller - getInterventions]', err.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Reverse geocode: lat/lng → address
exports.reverseGeocode = async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat et lng requis.' });
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1&accept-language=fr`,
      { headers: { 'User-Agent': 'FixMaCity/1.0 (contact@fixmacity.tn)' } }
    );
    const data = await r.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Geocoding error', detail: err.message });
  }
};

// Forward geocode: address string → coordinates
exports.forwardGeocode = async (req, res) => {
  const { q, viewbox, countrycodes = 'tn', limit = 10 } = req.query;
  if (!q) return res.status(400).json({ error: 'q requis.' });
  try {
    const params = new URLSearchParams({ q, format: 'json', limit, 'accept-language': 'fr', countrycodes });
    if (viewbox) params.append('viewbox', viewbox);
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'User-Agent': 'FixMaCity/1.0 (contact@fixmacity.tn)' } }
    );
    const data = await r.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Geocoding error', detail: err.message });
  }
};
