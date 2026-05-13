const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function checkUser() {
  try {
    const res = await pool.query(
      "SELECT id, email, role, first_name, last_name, is_active, department_id FROM users WHERE email = 'chef.voirie@sousse.tn';"
    );
    
    if (res.rows.length === 0) {
      console.log('❌ User not found');
    } else {
      console.log('✅ Chef Voirie Account:');
      console.log(res.rows[0]);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkUser();
