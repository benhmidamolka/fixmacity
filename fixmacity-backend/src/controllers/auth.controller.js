'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/db');
const { validationResult } = require('express-validator');

const SALT_ROUNDS = 12;

/* ──────────────── POST /api/auth/register ──────────────── */
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, first_name, last_name, delegation_id } = req.body;

    const { data: existing } = await supabase
      .from('users').select('id')
      .eq('email', email.toLowerCase().trim()).maybeSingle();

    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { data: user, error } = await supabase.from('users').insert({
      email: email.toLowerCase().trim(),
      password_hash,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      role: 'citizen',
      delegation_id,
      is_active: true,
    }).select('id, email, role, first_name, last_name, delegation_id, lang_pref').single();

    if (error) {
      console.error('[Auth] Register error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la création du compte.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────────── POST /api/auth/login ──────────────── */
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    const { data: user } = await supabase.from('users')
      .select('id, email, password_hash, role, first_name, last_name, delegation_id, department_id, lang_pref, is_active')
      .eq('email', email.toLowerCase().trim()).maybeSingle();

    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    if (!user.is_active) return res.status(403).json({ error: "Compte désactivé. Contactez l'administration." });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    const { password_hash, ...safeUser } = user;
    return res.status(200).json({ token, user: safeUser });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────────── GET /api/auth/me ──────────────── */
exports.me = async (req, res) => {
  return res.status(200).json({ user: req.user });
};

/* ──────────────── PATCH /api/auth/me ──────────────── */
exports.updateMe = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { lang_pref } = req.body;
    const updates = {};
    if (lang_pref !== undefined) updates.lang_pref = lang_pref;

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });

    const { data: user, error } = await supabase.from('users').update(updates)
      .eq('id', req.user.id)
      .select('id, email, role, first_name, last_name, delegation_id, department_id, lang_pref, is_active')
      .single();

    if (error) return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────────── POST /api/auth/logout ──────────────── */
exports.logout = async (req, res) => {
  try {
    if (!req.token || !req.user) {
      return res.status(400).json({ error: 'Token manquant ou non authentifié.' });
    }

    const decoded = jwt.decode(req.token);
    if (!decoded?.exp)
      return res.status(400).json({ error: 'Token invalide ou non décodable.' });

    await supabase.from('token_blacklist').insert({
      token: req.token,
      user_id: req.user.id,
      expires_at: new Date(decoded.exp * 1000).toISOString(),
    });

    return res.status(200).json({ message: 'Déconnexion réussie.' });
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────────── POST /api/auth/forgot-password ──────────────── */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis.' });

    const { data: user } = await supabase.from('users')
      .select('id, email, first_name')
      .eq('email', email.toLowerCase().trim()).maybeSingle();

    // Always 200 — prevents email enumeration
    if (!user)
      return res.status(200).json({ message: 'Si cet email existe, un lien a été envoyé.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour

    await supabase.from('password_reset_tokens').insert({
      user_id: user.id, token, expires_at: expires, used: false,
    });

    try {
      const { sendPasswordResetEmail } = require('../services/email.service');
      await sendPasswordResetEmail(user.email, user.first_name, token);
    } catch (e) {
      console.log('\n======================================================');
      console.log(`[OFFLINE DEV] Password Reset Token for ${user.email}:`);
      console.log(`Token: ${token}`);
      console.log('======================================================\n');
    }

    return res.status(200).json({ message: 'Si cet email existe, un lien a été envoyé.' });
  } catch (err) {
    console.error('[Auth] ForgotPassword error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────────── POST /api/auth/reset-password ──────────────── */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: 'Token et mot de passe requis.' });

    const { data: record } = await supabase.from('password_reset_tokens')
      .select('*').eq('token', token).eq('used', false)
      .gt('expires_at', new Date().toISOString()).maybeSingle();

    if (!record)
      return res.status(400).json({ error: 'Token invalide ou expiré.' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    await supabase.from('users').update({ password_hash }).eq('id', record.user_id);
    await supabase.from('password_reset_tokens').update({ used: true }).eq('id', record.id);

    return res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    console.error('[Auth] ResetPassword error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};