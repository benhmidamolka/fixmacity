'use strict';

/**
 * notification.service.js
 * Central notification system for FixMaCity.
 *
 * Every status change writes to the `notifications` table,
 * emits via Socket.io, and optionally sends an email.
 */

const supabase = require('../config/db');
const emailService = require('./email.service');

// ── Notification type constants ───────────────────────────────
const TYPES = {
  NEW_DECLARATION: 'NEW_DECLARATION',
  STATUS_CHANGE: 'STATUS_CHANGE',
  ASSIGNED_CHEF: 'ASSIGNED_CHEF',
  ASSIGNED_AGENT: 'ASSIGNED_AGENT',
  DECLARATION_ACCEPTED: 'DECLARATION_ACCEPTED',
  DECLARATION_REJECTED: 'DECLARATION_REJECTED',
  DECLARATION_RESOLVED: 'DECLARATION_RESOLVED',
  NEW_PROPOSITION: 'NEW_PROPOSITION',
};

/**
 * Core notify function — DB insert + Socket.io emit + optional email.
 *
 * @param {object} app              Express app instance
 * @param {object} opts
 * @param {string} opts.userId        Recipient user UUID
 * @param {string} opts.type          One of TYPES values
 * @param {string} opts.title         Short notification title
 * @param {string} opts.body          Longer description
 * @param {string} [opts.declarationId] Related declaration UUID
 * @param {boolean} [opts.sendEmail]  Whether to also send an email
 * @param {string} [opts.emailSubject] Email subject line
 * @param {string} [opts.emailHtml]   Email HTML body
 */
async function notify(app, opts) {
  const {
    userId,
    type,
    title,
    body,
    declarationId = null,
    sendEmail = false,
    emailSubject = null,
    emailHtml = null,
  } = opts;

  if (!userId || !type || !title) {
    console.warn('[Notification] Missing required fields (userId/type/title) — skipping');
    return null;
  }

  try {
    // 1. Persist to DB
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        body: body || null,
        reference_id: declarationId,
        is_read: false,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Notification] DB insert error:', error.message);
      return null;
    }

    // 2. Real-time push via Socket.io
    const emitToUser = app.get('emitToUser');
    if (emitToUser) {
      emitToUser(userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        declarationId: notification.reference_id,
        createdAt: notification.created_at,
        isRead: false,
      });
    }

    // 3. Optional email
    if (sendEmail) {
      const { data: user } = await supabase
        .from('users')
        .select('email, first_name, lang_pref')
        .eq('id', userId)
        .single();

      if (user?.email) {
        const subject = emailSubject || title;
        const html = emailHtml || buildDefaultEmailHtml(user, title, body, declarationId);
        await emailService.sendEmail(user.email, subject, html).catch(err => {
          console.error('[Notification] Email error:', err.message);
        });
      }
    }

    return notification;
  } catch (err) {
    console.error('[Notification] Unexpected error:', err.message);
    return null;
  }
}

/** Notify multiple user IDs at once */
async function notifyMany(app, userIds, opts) {
  await Promise.allSettled(
    userIds.map(userId => notify(app, { ...opts, userId }))
  );
}

/** Notify all active users with a given role */
async function notifyRole(app, role, opts) {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('role', role)
    .eq('is_active', true);

  if (!users || users.length === 0) return;
  await notifyMany(app, users.map(u => u.id), opts);
}

// ── Status → citizen-facing message map ──────────────────────
//
// Every internal status that can transition has a citizen message.
// FIX: Previously 'assignee_chef' and 'refusee_agent' were in a
// SILENT_CITIZEN_STATUSES set, which meant citizens never received:
//   - "Votre déclaration a été reçue et est en cours de traitement."  (assignee_chef)
//   - "Votre déclaration a été redirigée vers un autre agent."        (refusee_agent)
// Both are documented in the PRD and expected by the frontend.
// The SILENT set has been removed entirely.
//
const CITIZEN_STATUS_MESSAGES = {
  assignee_chef: 'Votre déclaration a été reçue et est en cours de traitement.',
 assignee_agent: "Un agent travaille actuellement sur votre problème.",
  en_cours: "Un agent travaille actuellement sur votre problème.",
  resolue: "Votre problème a été résolu ! Merci d'évaluer notre service.",
  refusee_chef: 'Votre déclaration a été redirigée vers un autre service.',
  refusee_agent: 'Votre déclaration a été redirigée vers un autre agent.',
  cloturee: 'Votre déclaration a été clôturée.',
};

// Statuses where we also send an email (not just in-app)
const EMAIL_ON_STATUS = new Set(['en_cours', 'resolue', 'refusee_chef', 'cloturee']);

/**
 * Notify the citizen when their declaration status changes.
 * @param {object} app
 * @param {object} declaration  Declaration row (must have ref_citoyen, id)
 * @param {string} citizenId    UUID of the citizen to notify
 * @param {string} dbNewStatus  New internal status (declaration_status enum value)
 */
async function notifyStatusChange(app, declaration, citizenId, dbNewStatus) {
  if (!citizenId || !declaration?.id) return;

  const message = CITIZEN_STATUS_MESSAGES[dbNewStatus];
  if (!message) return; // e.g. 'soumise' — no citizen message needed at submission

  const declTitle = declaration.title || declaration.ref_citoyen || 'votre déclaration';

  await notify(app, {
    userId: citizenId,
    type: TYPES.STATUS_CHANGE,
    title: `« ${declTitle} »`,
    body: message,
    declarationId: declaration.id,
    sendEmail: EMAIL_ON_STATUS.has(dbNewStatus),
    emailSubject: `[FixMaCity] Mise à jour : ${declaration.ref_citoyen}`,
  });
}

/** All active presidents notified when a new declaration is submitted */
async function notifyNewDeclaration(app, declaration) {
  await notifyRole(app, 'president', {
    type: TYPES.NEW_DECLARATION,
    title: 'Nouvelle déclaration soumise',
    body: `Réf: ${declaration.ref_citoyen} — Catégorie: ${declaration.category}`,
    declarationId: declaration.id,
    sendEmail: false,
  });
}

/** First active chef of the assigned department notified on assignment */
async function notifyChefAssigned(app, declaration, chefId) {
  await notify(app, {
    userId: chefId,
    type: TYPES.ASSIGNED_CHEF,
    title: 'Nouvelle déclaration assignée à votre département',
    body: `Réf: ${declaration.ref_service || declaration.ref_citoyen} — ${declaration.title}`,
    declarationId: declaration.id,
    sendEmail: true,
    emailSubject: `[FixMaCity] Nouvelle affectation : ${declaration.ref_service || declaration.ref_citoyen}`,
  });
}

/** Agent notified when a declaration is assigned to them */
async function notifyAgentAssigned(app, declaration, agentId) {
  await notify(app, {
    userId: agentId,
    type: TYPES.ASSIGNED_AGENT,
    title: 'Nouvelle tâche assignée',
    body: `Réf: ${declaration.ref_service || declaration.ref_citoyen} — ${declaration.title}`,
    declarationId: declaration.id,
    sendEmail: false,
  });
}

/** All active presidents notified when a chef refuses a declaration */
async function notifyChefRejected(app, declaration, rejectionReason) {
  await notifyRole(app, 'president', {
    type: TYPES.DECLARATION_REJECTED,
    title: 'Déclaration refusée par un Chef de Service',
    body: `Réf: ${declaration.ref_service || declaration.ref_citoyen} — Motif: ${rejectionReason}`,
    declarationId: declaration.id,
    sendEmail: true,
    emailSubject: '[FixMaCity] Action requise : déclaration refusée',
  });
}

// ── Default email template ────────────────────────────────────
function buildDefaultEmailHtml(user, title, body, declarationId) {
  const firstName = user.first_name || 'Citoyen';
  const refLink = declarationId
    ? `<p><a href="${process.env.FRONTEND_URL}/declarations/${declarationId}"
          style="color:#1A6FA8">Voir ma déclaration →</a></p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#1C2833">
  <div style="background:#0D2137;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:#fff;margin:0;font-size:22px">FixMaCity</h1>
    <p style="color:#AED6F1;margin:4px 0 0">Municipalité de Sousse</p>
  </div>
  <div style="background:#f8f9fa;padding:24px;border:1px solid #dee2e6;border-radius:0 0 8px 8px">
    <p>Bonjour <strong>${firstName}</strong>,</p>
    <h2 style="color:#0D2137;font-size:18px">${title}</h2>
    <p style="color:#444;line-height:1.6">${body || ''}</p>
    ${refLink}
    <hr style="border:none;border-top:1px solid #dee2e6;margin:20px 0">
    <p style="font-size:12px;color:#888">
      Cet email a été envoyé automatiquement par FixMaCity.<br>
      Municipalité de Sousse — Tunisie
    </p>
  </div>
</body>
</html>`;
}

module.exports = {
  notify,
  notifyMany,
  notifyRole,
  notifyNewDeclaration,
  notifyStatusChange,
  notifyChefAssigned,
  notifyAgentAssigned,
  notifyChefRejected,
  TYPES,
};