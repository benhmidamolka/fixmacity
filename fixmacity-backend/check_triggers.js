require('dotenv').config();
const supabase = require('./src/config/db');

async function checkTriggers() {
  try {
    const { rows } = await supabase.pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'get_proposition_summary';
    `);
    console.log('Triggers found:', rows);
    process.exit(0);
  } catch (err) {
    console.error('Error checking triggers:', err);
    process.exit(1);
  }
}

checkTriggers();
