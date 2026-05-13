const { Pool } = require('pg');
require('dotenv').config(); 

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function findPresident() {
  try {
    const res = await pool.query("SELECT email, role, first_name, last_name FROM users WHERE role = 'president'");
    if (res.rows.length > 0) {
      console.log('President users found:', res.rows);
    } else {
      console.log('No president user found. Check all users:');
      const allRes = await pool.query("SELECT email, role FROM users LIMIT 10");
      console.log(allRes.rows);
    }
  } catch (err) {
    console.error('Error searching for president:', err);
  } finally {
    await pool.end();
  }
}

findPresident();
