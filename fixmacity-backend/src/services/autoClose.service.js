const supabase = require('../config/db');
const { logStatusChange } = require('./statusHistory.service');

/**
 * Auto-close declarations that have been in 'resolue' for more than 7 days
 * without receiving a citizen rating. Moves them to 'cloturee'.
 *
 * @returns {number} Number of declarations closed
 */
async function autoCloseResolvedDeclarations() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Find 'resolue' declarations whose resolved_at was > 7 days ago
  const { data: candidates, error: fetchErr } = await supabase
    .from('declarations')
    .select('id')
    .eq('status', 'resolue')
    .lte('resolved_at', sevenDaysAgo)
    .is('deleted_at', null)
    .eq('is_deleted', false);

  if (fetchErr) throw fetchErr;
  if (!candidates || candidates.length === 0) return 0;

  let closedCount = 0;

  for (const decl of candidates) {
    // Check if a rating exists
    const { data: rating } = await supabase
      .from('ratings')
      .select('id')
      .eq('declaration_id', decl.id)
      .maybeSingle();

    if (rating) continue; // citizen rated — do not auto-close

    // Update to cloturee
    const { error: updateErr } = await supabase
      .from('declarations')
      .update({ status: 'cloturee', updated_at: new Date().toISOString() })
      .eq('id', decl.id);

    if (updateErr) {
      console.error(`[AutoClose] Failed for ${decl.id}:`, updateErr.message);
      continue;
    }

    await logStatusChange(decl.id, 'resolue', 'cloturee', null, 'Auto-clôture après 7 jours sans évaluation.');
    closedCount++;
  }

  return closedCount;
}

module.exports = { autoCloseResolvedDeclarations };