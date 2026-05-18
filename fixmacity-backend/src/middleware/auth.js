const jwt = require('jsonwebtoken');
const supabase = require('../config/db');
const rbac = require('./rbac');

const JWT_SECRET = process.env.JWT_SECRET || '';

// Verify JWT and attach user to request
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: blacklisted } = await supabase
      .from('token_blacklist')
      .select('id')
      .eq('token', token)
      .single();

    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id || decoded.userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    return next();
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Optional auth (attaches user if token exists, continues without)
async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) return next();

    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id || decoded.userId)
      .single();

    if (user) req.user = user;
  } catch {
    // ignore — optional auth
  }

  return next();
}

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.authorize = rbac;
module.exports.optionalAuth = optionalAuth;