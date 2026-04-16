'use strict';

// FIX #5: This file contained a copy of the declarations CONTROLLER code.
// Restored to the correct autoClose service implementation.

const supabase = require('../config/db');
const { logStatusChange } = require('./statusHistory.service');
const { notifyStatusChange } = require('./notification.service');

/**
 * Auto-close declarations that have been in `resolue` for more than 7 days
 * without receiving a citizen rating. Moves them to `cloturee`.
 *
 * - `closed_at` is NOT used because that column doesn't exist in the schema.
 *   The transition timestamp is captured by logStatusChange() instead.
 * - `changedBy` is null because this is a system-triggered transition.
 *
 * @param {object} app  Express app instance (for Socket.io + email notifications)
 * @returns {number}    Number of declarations auto-closed
 */
async function autoCloseResolvedDeclarations(app) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error: fetchErr } = await supabase
    .from('declarations')
    .select('id, user_id, ref_citoyen')
    .eq('status', 'resolue')
    .lte('resolved_at', sevenDaysAgo)
    .is('deleted_at', null);

  if (fetchErr) throw fetchErr;
  if (!candidates || candidates.length === 0) return 0;

  let closedCount = 0;

  for (const decl of candidates) {
    // Skip declarations the citizen already rated
    const { data: rating } = await supabase
      .from('ratings')
      .select('id')
      .eq('declaration_id', decl.id)
      .maybeSingle();

    if (rating) continue;

    // Transition to cloturee
    const { error: updateErr } = await supabase
      .from('declarations')
      .update({ status: 'cloturee' })
      .eq('id', decl.id);

    if (updateErr) {
      console.error(`[AutoClose] Failed for ${decl.id}:`, updateErr.message);
      continue;
    }

    // Log the system-triggered transition (changedBy = null for CRON jobs)
    await logStatusChange(
      decl.id,
      'resolue',
      'cloturee',
      null,
      'Auto-clôture après 7 jours sans évaluation.'
    );

    if (app) {
      await notifyStatusChange(app, decl, decl.user_id, 'cloturee').catch(() => { });
    }

    closedCount++;
  }

  return closedCount;
}

module.exports = { autoCloseResolvedDeclarations };