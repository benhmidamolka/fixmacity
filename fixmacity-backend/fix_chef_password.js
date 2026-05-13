const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function fixPassword() {
  try {
    const hashedPassword = await bcrypt.hash('Password123!', 12);
    const res = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, role",
      [hashedPassword, 'chef.voirie@sousse.tn']
    );
    console.log('Updated user:', res.rows);
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    await pool.end();
  }
}

fixPassword();
