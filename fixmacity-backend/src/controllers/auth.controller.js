const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/db');
const { validationResult } = require('express-validator');

const SALT_ROUNDS = 12;

/* ──────────────── POST /api/auth/register ──────────────── */
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, delegation_id } = req.body;

    // Check uniqueness
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }

    // Verify delegation exists
    if (delegation_id) {
      const { data: deleg } = await supabase
        .from('delegations')
        .select('id')
        .eq('id', delegation_id)
        .maybeSingle();

      if (!deleg) {
        return res.status(400).json({ error: 'Délégation invalide.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email:         email.toLowerCase().trim(),
        password_hash: hashedPassword,
        first_name:    first_name.trim(),
        last_name:     last_name.trim(),
        role:          'citizen',
        delegation_id: delegation_id || null,
        is_active:     true,
      })
      .select('id, email, role, first_name, last_name, delegation_id')
      .single();

    if (error) {
      console.error('[Auth] Register insert error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la création du compte.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

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
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role, first_name, last_name, delegation_id, department_id, is_active')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Compte désactivé. Contactez l\'administration.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password_hash, ...safeUser } = user;

    return res.status(200).json({ token, user: safeUser });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────────── GET /api/auth/me ──────────────── */
exports.me = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (err) {
    console.error('[Auth] Me error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────────── PATCH /api/auth/me ──────────────── */
exports.updateMe = async (req, res) => {
  try {
    const { first_name, last_name, lang_pref } = req.body;
    const updates = {};
    if (first_name) updates.first_name = first_name.trim();
    if (last_name)  updates.last_name  = last_name.trim();
    if (lang_pref)  updates.lang_pref  = lang_pref;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, email, role, first_name, last_name, delegation_id, department_id, lang_pref')
      .single();

    if (error) {
      console.error('[Auth] updateMe error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour du profil.' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error('[Auth] updateMe error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────────── POST /api/auth/logout ──────────────── */
exports.logout = async (req, res) => {
  try {
    await supabase.from('token_blacklist').insert({
      token:      req.token,
      user_id:    req.user.id,
      expires_at: new Date(jwt.decode(req.token).exp * 1000).toISOString(),
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

    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store the token hash in DB
    await supabase.from('password_resets').upsert({
      user_id: user.id,
      token_hash: resetTokenHash,
      expires_at: expiresAt,
    }, { onConflict: 'user_id' });

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Try to send email
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"FixMaCity" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: '🔑 Réinitialisation de votre mot de passe FixMaCity',
        html: `
          <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #191c1e; font-size: 24px;">Bonjour ${user.first_name},</h2>
            <p style="color: #44474f; line-height: 1.6;">Vous avez demandé la réinitialisation de votre mot de passe FixMaCity.</p>
            <a href="${resetUrl}" style="display: inline-block; background: #003ca2; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin: 24px 0;">
              Réinitialiser mon mot de passe
            </a>
            <p style="color: #74777f; font-size: 13px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
            <hr style="border: none; border-top: 1px solid #e0e3e5; margin: 32px 0;" />
            <p style="color: #74777f; font-size: 11px;">Municipalité de Sousse · FixMaCity</p>
          </div>
        `,
      });
      console.log(`[Auth] Reset email sent to ${user.email}`);
    } catch (emailErr) {
      console.error('[Auth] Email send error:', emailErr.message);
      console.log(`[Auth] DEV RESET URL: ${resetUrl}`);
    }

    // Send in-app notification about the request
    try {
      const notificationService = require('../services/notification.service');
      await notificationService.notify(req.app, {
        userId: user.id,
        type: 'SECURITY_ALERT',
        title: 'Demande de réinitialisation',
        body: 'Un lien de réinitialisation de mot de passe a été envoyé à votre adresse email.',
        sendEmail: false
      });
    } catch (notifErr) {
      console.warn('[Auth] Forgot password notification failed:', notifErr.message);
    }

    return res.status(200).json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/* ──────────────── POST /api/auth/reset-password ──────────────── */
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis.' });
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: resetRecord } = await supabase
      .from('password_resets')
      .select('user_id, expires_at')
      .eq('token_hash', tokenHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!resetRecord) {
      return res.status(400).json({ error: 'Lien invalide ou expiré.' });
    }

    // Update the user's password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', resetRecord.user_id);

    if (updateError) {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour du mot de passe.' });
    }

    // Delete the reset token
    await supabase.from('password_resets').delete().eq('user_id', resetRecord.user_id);

    // Send in-app notification
    try {
      const notificationService = require('../services/notification.service');
      await notificationService.notify(req.app, {
        userId: resetRecord.user_id,
        type: 'SECURITY_ALERT',
        title: 'Mot de passe réinitialisé',
        body: 'Votre mot de passe a été modifié avec succès. Si vous n\'êtes pas à l\'origine de cette action, contactez le support.',
        sendEmail: false
      });
    } catch (notifErr) {
      console.warn('[Auth] Post-reset notification failed:', notifErr.message);
    }

    return res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};