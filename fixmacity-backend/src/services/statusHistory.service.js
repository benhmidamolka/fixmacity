'use strict';

// db.js exports the supabase shim object; pool is a property on it.
const db = require('../config/db');
const pool = db.pool;

/**
 * Insert a row into status_history.
 *
 * Uses raw pool.query so null `changedBy` (CRON auto-close) is handled
 * correctly — the QB shim can struggle with null UUIDs on typed columns.
 *
 * @param {string}      declarationId
 * @param {string|null} oldStatus
 * @param {string}      newStatus
 * @param {string|null} changedBy   null for CRON/system transitions
 * @param {string|null} raison
 */
async function logStatusChange(declarationId, oldStatus, newStatus, changedBy = null, raison = null) {
  try {
    await pool.query(
      `INSERT INTO status_history
         (declaration_id, old_status, new_status, changed_by, raison, created_at)
       VALUES ($1, $2::declaration_status, $3::declaration_status, $4::uuid, $5, NOW())`,
      [declarationId, oldStatus || null, newStatus, changedBy || null, raison || null]
    );
  } catch (err) {
    // Log but don't re-throw — a failed history insert should never crash the
    // main workflow (the declaration status was already updated).
    console.error('[StatusHistory] Insert failed:', err.message);
  }
}

module.exports = { logStatusChange };