'use strict';

const supabase = require('../config/db');

/**
 * Returns today's date as MM-DD-YY (local time).
 * Including the date in the sequence prefix means the counter
 * resets automatically at midnight each day.
 */
function todayKey() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy}`;
}

/**
 * Generate ref_citoyen at declaration submission.
 * Format: SV-04-08-26-0001 (First 2 letters of delegation code + MM-DD-YY + 4 digits)
 */
async function generateRefCitoyen(delegationId) {
  const { data: delegation, error } = await supabase
    .from('delegations').select('code').eq('id', delegationId).single();

  if (error || !delegation)
    throw new Error(`Délégation introuvable pour l'id : ${delegationId}`);

  const dateKey = todayKey();
  // Use the 2-letter code from the database (e.g., 'SV' for Sousse Ville)
  const prefix = `${delegation.code}-${dateKey}`;

  // Use raw pool.query to get a reliable scalar integer back.
  const res = await supabase.pool.query(
    `SELECT increment_ref_sequence($1) AS seq`, [prefix]
  );
  const seq = String(res.rows[0].seq).padStart(4, '0');
  return `${delegation.code}-${dateKey}-${seq}`;
}

/**
 * Generate ref_service when president assigns to a department.
 * Format: VR-04-08-26-0001 (First 2 letters of service code + MM-DD-YY + 4 digits)
 */
async function generateRefService(departmentId) {
  const { data: service, error } = await supabase
    .from('services').select('code').eq('id', departmentId).single();

  if (error || !service)
    throw new Error(`Département introuvable pour l'id : ${departmentId}`);

  const dateKey = todayKey();
  // Use the 2-letter code from the database (e.g., 'VR' for Voirie & Routes)
  const prefix = `${service.code}-${dateKey}`;

  const res = await supabase.pool.query(
    `SELECT increment_ref_sequence($1) AS seq`, [prefix]
  );
  const seq = String(res.rows[0].seq).padStart(4, '0');
  return `${service.code}-${dateKey}-${seq}`;
}

module.exports = { generateRefCitoyen, generateRefService };
