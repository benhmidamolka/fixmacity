require('dotenv').config();
const supabase = require('./src/config/db');
async function test() {
  try {
    const res = await supabase.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
test();
