const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const supabase = require('../config/db');
const { sendPasswordResetEmail } = require('../services/email.service');

const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } // Shorter access token
  );
}

async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { data, error } = await supabase
    .from('refresh_tokens')
    .insert({ user_id: userId, token, expires_at: expires_at.toISOString() })
    .select()
    .single();

  if (error) throw error;
  return token;
}

function safeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password, first_name, last_name, delegation_id, lang_pref = 'fr' } = req.body;

    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).single();
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash, first_name, last_name, delegation_id, lang_pref, role: 'citizen' })
      .select()
      .single();

    if (error) throw error;

    const token = signToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    res.status(201).json({ token, refreshToken, user: safeUser(user) });
  } catch (err) {
    console.error('[Auth] register:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users').select('*').eq('email', email).single();

    if (error || !user) return res.status(401).json({ error: 'Identifiants invalides' });
    if (!user.is_active) return res.status(403).json({ error: 'Compte désactivé' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    const token = signToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    res.json({ token, refreshToken, user: safeUser(user) });
  } catch (err) {
    console.error('[Auth] login:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, delegation_id, department_id, lang_pref, is_active, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(data);
  } catch (err) {
    console.error('[Auth] getMe:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── PATCH /api/auth/me ───────────────────────────────────────────────────────
exports.updateMe = async (req, res) => {
  try {
    const { lang_pref, first_name, last_name, email } = req.body;
    
    const updates = {};
    if (lang_pref) {
      const allowed = ['fr', 'ar', 'en'];
      if (!allowed.includes(lang_pref)) {
        return res.status(400).json({ error: 'lang_pref doit être fr, ar ou en' });
      }
      updates.lang_pref = lang_pref;
    }
    
    if (first_name) updates.first_name = first_name;
    if (last_name) updates.last_name = last_name;
    if (email) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, email, first_name, last_name, lang_pref, role')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Auth] updateMe:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── PATCH /api/auth/profil (Alias for updateMe) ───────────────────────────
exports.updateProfile = exports.updateMe;

// ─── PATCH /api/auth/mot-de-passe ───────────────────────────────────────────
exports.updatePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
    }

    // Get current user with password_hash
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Verify current password
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

    // Hash new password
    const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);

    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', req.user.id);

    if (updateErr) throw updateErr;

    // Revoke all refresh tokens for this user for security
    await supabase.from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .is('revoked_at', null);

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    console.error('[Auth] updatePassword:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(400).json({ error: 'Token manquant' });

    const decoded = jwt.decode(token);
    const expires_at = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('token_blacklist').insert({ token, user_id: req.user.id, expires_at });
    
    // Also revoke refresh tokens
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      await supabase.from('refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token', refreshToken);
    }

    res.json({ message: 'Déconnexion réussie' });
  } catch (err) {
    console.error('[Auth] logout:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email } = req.body;

    // Always return 200 to avoid email enumeration
    const { data: user } = await supabase
      .from('users').select('id, email, first_name').eq('email', email).single();

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h

      // Delete any existing token for this user first, then insert fresh
      await supabase.from('password_reset_tokens')
        .delete()
        .eq('user_id', user.id);

      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const { error: insertErr } = await supabase.from('password_reset_tokens').insert({
        user_id: user.id,
        token: hashedToken,
        expires_at,
        used: false,
      });

      if (insertErr) {
        console.error('[Auth] forgotPassword insert error:', insertErr.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, user.first_name, rawToken);
    }

    res.json({ message: 'Si cet email existe, un lien de r\u00e9initialisation a \u00e9t\u00e9 envoy\u00e9.' });
  } catch (err) {
    console.error('[Auth] forgotPassword:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const { data: reset, error } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token', hashedToken)
      .single();

    if (error || !reset)  return res.status(400).json({ error: 'Token invalide ou expir\u00e9' });
    if (reset.used)       return res.status(400).json({ error: 'Ce lien a d\u00e9j\u00e0 \u00e9t\u00e9 utilis\u00e9' });
    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Ce lien de r\u00e9initialisation a expir\u00e9' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    await supabase.from('users')
      .update({ password_hash })
      .eq('id', reset.user_id);

    // Mark token as used (prevents replay)
    await supabase.from('password_reset_tokens')
      .update({ used: true })
      .eq('id', reset.id);

    res.json({ message: 'Mot de passe r\u00e9initialis\u00e9 avec succ\u00e8s' });
  } catch (err) {
    console.error('[Auth] resetPassword:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── POST /api/auth/refresh ──────────────────────────────────────────────────
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'RefreshToken manquant' });

    const { data: rt, error } = await supabase
      .from('refresh_tokens')
      .select('*, user:users(*)')
      .eq('token', refreshToken)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !rt) {
      return res.status(401).json({ error: 'RefreshToken invalide ou expiré' });
    }

    // Optional: Rotate refresh token (revoke old, issue new)
    await supabase.from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', rt.id);

    const token = signToken(rt.user);
    const newRefreshToken = await issueRefreshToken(rt.user.id);

    res.json({ token, refreshToken: newRefreshToken, user: safeUser(rt.user) });
  } catch (err) {
    console.error('[Auth] refresh:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};