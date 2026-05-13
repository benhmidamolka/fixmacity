require('dotenv').config();
const { pool } = require('./src/config/db');

async function main() {
  try {
    const res = await pool.query("SELECT table_type FROM information_schema.tables WHERE table_name = 'declarations'");
    console.log('declarations is:', res.rows[0]);

    const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'declarations'");
    console.log('columns:', cols.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
