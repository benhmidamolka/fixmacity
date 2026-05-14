const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'fixmacity-backend', '.env');
const env = fs.readFileSync(envPath, 'utf8');
const db_url = env.match(/DB_HOST=(.*)/)[1].trim();
const db_user = env.match(/DB_USER=(.*)/)[1].trim();
const db_pass = env.match(/DB_PASSWORD=(.*)/)[1].trim();
const db_name = env.match(/DB_NAME=(.*)/)[1].trim();

const pool = new Pool({
  host: db_url,
  user: db_user,
  password: db_pass,
  database: db_name,
  port: 5432
});

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', res.rows.map(r => r.table_name));
    
    const tokens = await pool.query("SELECT * FROM password_reset_tokens");
    console.log('Tokens:', JSON.stringify(tokens.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
