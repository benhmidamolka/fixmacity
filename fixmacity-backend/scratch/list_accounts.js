const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function listAllAccounts() {
  try {
    const roles = ['president', 'chef', 'agent', 'citizen'];
    for (const role of roles) {
      const res = await pool.query("SELECT email, role, first_name, last_name FROM users WHERE role = $1 LIMIT 1", [role]);
      if (res.rows.length > 0) {
        console.log(`Role: ${role.toUpperCase()}`);
        console.log(`Email: ${res.rows[0].email}`);
        console.log(`Name: ${res.rows[0].first_name} ${res.rows[0].last_name}`);
        console.log('---');
      } else {
        console.log(`No user found for role: ${role}`);
        console.log('---');
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

listAllAccounts();
