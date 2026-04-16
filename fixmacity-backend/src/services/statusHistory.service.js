'use strict';

const { pool } = require('../config/db');

/**
 * Insert a row into status_history.
 *
 * Uses a raw pool.query instead of the shim to safely handle
 * null `changedBy` (CRON auto-close) — passing null through the
 * shim's QB.insert() can cause a pg type-mismatch on UUID columns.
 *
 * @param {string}      declarationId
 * @param {string|null} oldStatus
 * @param {string}      newStatus
 * @param {string|null} changedBy   null for CRON/system transitions
 * @param {string|null} raison
 */
async function logStatusChange(declarationId, oldStatus, newStatus, changedBy, raison = null) {
  try {
    await pool.query(
      `INSERT INTO status_history
         (declaration_id, old_status, new_status, changed_by, raison, created_at)
       VALUES ($1, $2::declaration_status, $3::declaration_status, $4::uuid, $5, NOW())`,
      [declarationId, oldStatus || null, newStatus, changedBy || null, raison || null]
    );
  } catch (err) {
    console.error('[StatusHistory] Insert failed:', err.message);
    throw new Error('Impossible de journaliser le changement de statut.');
  }
}

module.exports = { logStatusChange };