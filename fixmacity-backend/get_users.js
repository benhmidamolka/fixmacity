const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function findUsers() {
  try {
    const res = await pool.query("SELECT email, role, first_name, last_name FROM users");
    console.log('Users found:', res.rows);
  } catch (err) {
    console.error('Error searching for users:', err);
  } finally {
    await pool.end();
  }
}

findUsers();
