'use strict';

const nodemailer = require('nodemailer');

// ── Transporter (lazy-initialized) ───────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,  // Gmail: use an App Password, not your real password
    },
  });

  return _transporter;
}

/**
 * Send a transactional email.
 *
 * @param {string} to       Recipient email address
 * @param {string} subject  Email subject
 * @param {string} html     HTML body
 * @param {string} [text]   Plain-text fallback (auto-stripped from html if omitted)
 */
async function sendEmail(to, subject, html, text = null) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email] EMAIL_USER or EMAIL_PASS not set — skipping email to:', to);
    return;
  }

  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from:    `"FixMaCity - Municipalité de Sousse" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text:    text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  });

  console.log(`[Email] Sent to ${to} — MessageId: ${info.messageId}`);
  return info;
}

/**
 * Send email verification link to a newly registered citizen.
 */
async function sendVerificationEmail(toEmail, firstName, verificationToken) {
  const link = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#1C2833">
  <div style="background:#0D2137;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:#fff;margin:0">FixMaCity</h1>
    <p style="color:#AED6F1;margin:4px 0 0">Municipalité de Sousse</p>
  </div>
  <div style="background:#f8f9fa;padding:24px;border:1px solid #dee2e6;border-radius:0 0 8px 8px">
    <p>Bonjour <strong>${firstName}</strong>,</p>
    <p>Merci de vous être inscrit sur FixMaCity. Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${link}"
         style="background:#1A6FA8;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">
        Vérifier mon email
      </a>
    </div>
    <p style="color:#666;font-size:13px">Ce lien expire dans <strong>24 heures</strong>.</p>
    <p style="color:#666;font-size:13px">Si vous n'avez pas créé ce compte, ignorez cet email.</p>
    <hr style="border:none;border-top:1px solid #dee2e6;margin:20px 0">
    <p style="font-size:12px;color:#888">FixMaCity — Municipalité de Sousse, Tunisie</p>
  </div>
</body>
</html>`;

  return sendEmail(toEmail, 'Vérifiez votre email — FixMaCity', html);
}

/**
 * Send password reset link.
 */
async function sendPasswordResetEmail(toEmail, firstName, resetToken) {
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#1C2833">
  <div style="background:#0D2137;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:#fff;margin:0">FixMaCity</h1>
  </div>
  <div style="background:#f8f9fa;padding:24px;border:1px solid #dee2e6;border-radius:0 0 8px 8px">
    <p>Bonjour <strong>${firstName}</strong>,</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${link}"
         style="background:#C25A00;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">
        Réinitialiser mon mot de passe
      </a>
    </div>
    <p style="color:#666;font-size:13px">Ce lien expire dans <strong>1 heure</strong>.</p>
    <p style="color:#666;font-size:13px">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    <hr style="border:none;border-top:1px solid #dee2e6;margin:20px 0">
    <p style="font-size:12px;color:#888">FixMaCity — Municipalité de Sousse, Tunisie</p>
  </div>
</body>
</html>`;

  return sendEmail(toEmail, 'Réinitialisation de mot de passe — FixMaCity', html);
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };