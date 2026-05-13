const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/Client/OneDrive/Bureau/Fixmacity/fixmacity-backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function listUsers() {
  try {
    const res = await pool.query('SELECT email, role, is_active FROM users');
    console.log('Users:', res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

listUsers();
