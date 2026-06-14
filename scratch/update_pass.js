const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../fixmacity-backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '98452169.PApa',
});

async function main() {
  const client = await pool.connect();
  try {
    const email = 'chef.voirie@sousse.tn';
    const newPassword = 'password123';
    const hash = await bcrypt.hash(newPassword, 12);
    await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
    console.log(`Password updated for ${email}`);
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
