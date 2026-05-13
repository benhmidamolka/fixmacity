const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function resetPresident() {
  try {
    const password = 'Password123!';
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log(`🚀 Resetting password for president@sousse.tn...`);
    const res = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id",
      [hash, 'president@sousse.tn']
    );
    
    if (res.rowCount > 0) {
      console.log('✅ President password reset to Password123!');
    } else {
      console.log('❌ President user not found.');
    }
  } catch (err) {
    console.error('❌ Error resetting password:', err.message);
  } finally {
    await pool.end();
  }
}

resetPresident();
