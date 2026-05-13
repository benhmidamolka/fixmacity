const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:98452169.PApa@localhost:5432/fixmacity'
});

async function check() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  console.log(res.rows.map(r => r.column_name));
  process.exit();
}
check();
