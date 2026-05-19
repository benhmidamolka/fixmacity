const supabase = require('../config/db');

/**
 * Atomic counter — increments a row in `ref_sequences` and returns the new value.
 * Uses the existing DB function increment_ref_sequence(p_prefix TEXT) → INTEGER
 */
async function getNextSequence(prefix) {
  const { data, error } = await supabase.rpc('increment_ref_sequence', {
    p_prefix: prefix,
  });

  if (error) {
    console.error('[RefGenerator] Sequence error:', error.message);
    throw new Error('Impossible de générer la référence.');
  }

  return data; // returns the new integer value
}

/**
 * Generates ref_citoyen:  {DELEGATION_CODE}-DD-MM-YY-XXXX
 * @param {string} delegationCode - The 2-letter delegation code (SV, SJ, SA)
 */
async function generateRefCitoyen(delegationCode) {
  if (!delegationCode) throw new Error('Code arrondissement manquant.');

  const now     = new Date();
  const dd      = String(now.getDate()).padStart(2, '0');
  const mm      = String(now.getMonth() + 1).padStart(2, '0');
  const yy      = String(now.getFullYear()).slice(-2);
  const dateStr = `${dd}-${mm}-${yy}`;

  const prefix = `${delegationCode}-${dateStr}`;
  const seq    = await getNextSequence(prefix);
  const seqStr = String(seq).padStart(4, '0');

  return `${prefix}-${seqStr}`;
}

/**
 * Generates ref_service:  {SERVICE_CODE}-DD-MM-YY-XXXX
 * @param {string} serviceCode - The 2-letter service code (VR, EP, PD, etc.)
 */
async function generateRefService(serviceCode) {
  if (!serviceCode) throw new Error('Code service manquant.');

  const now     = new Date();
  const dd      = String(now.getDate()).padStart(2, '0');
  const mm      = String(now.getMonth() + 1).padStart(2, '0');
  const yy      = String(now.getFullYear()).slice(-2);
  const dateStr = `${dd}-${mm}-${yy}`;

  const prefix = `${serviceCode}-${dateStr}`;
  const seq    = await getNextSequence(prefix);
  const seqStr = String(seq).padStart(4, '0');

  return `${prefix}-${seqStr}`;
}

module.exports = { generateRefCitoyen, generateRefService };
