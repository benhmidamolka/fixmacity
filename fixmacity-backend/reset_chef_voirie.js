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

async function resetPassword() {
  try {
    const newPassword = 'Chef1234!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const res = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, role, first_name, last_name",
      [hashedPassword, 'chef.voirie@sousse.tn']
    );
    
    if (res.rows.length === 0) {
      console.log('❌ No user found with email chef.voirie@sousse.tn');
    } else {
      console.log('✅ Password reset successfully!');
      console.log('User:', res.rows[0]);
      console.log(`\nLogin credentials:\nEmail: chef.voirie@sousse.tn\nPassword: ${newPassword}`);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
