const supabase = require('./src/config/db');

async function checkEnum() {
  const { pool } = supabase;
  try {
    const res = await pool.query(`
      SELECT e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'declaration_status'
    `);
    console.log('Enum labels:', res.rows.map(r => r.enumlabel));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

checkEnum();
