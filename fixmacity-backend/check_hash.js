const { Pool } = require('pg');
require('dotenv').config(); 

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function checkHash() {
  try {
    const res = await pool.query("SELECT password_hash FROM users WHERE email = 'president@sousse.tn'");
    console.log('Hash in DB:', res.rows[0].password_hash);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkHash();
