require('dotenv').config();
const { Pool } = require('pg');

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
      'SELECT email, role, is_active FROM users WHERE email = $1',
      ['president@sousse.tn']
    );
    
    if (res.rows[0]) {
      console.log('President User found:', JSON.stringify(res.rows[0], null, 2));
    } else {
      console.log('President User NOT found in database.');
    }
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
  } finally {
    await pool.end();
  }
}

checkUser();
