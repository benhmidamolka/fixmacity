'use strict';

const jwt = require('jsonwebtoken');
const supabase = require('../config/db');

/**
 * Verifies JWT from Authorization header, attaches req.user.
 *
 * FIX #2: Blacklist check now filters by expires_at > now() so expired rows are
 * ignored automatically and the query stays fast even as the table grows.
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant ou mal formé.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, first_name, last_name, delegation_id, department_id, lang_pref, is_active')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Utilisateur introuvable.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Compte désactivé.' });
    }

    // FIX #2: Only match blacklisted tokens that have not yet expired.
    // This prevents the table from being a full-scan bottleneck over time.
    const now = new Date().toISOString();
    const { data: blacklisted } = await supabase
      .from('token_blacklist')
      .select('id')
      .eq('token', token)
      .gt('expires_at', now)   // <-- only live blacklist entries count
      .maybeSingle();

    if (blacklisted) {
      return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide.' });
    }
    return res.status(500).json({ error: "Erreur d'authentification." });
  }
};

module.exports = authenticate;