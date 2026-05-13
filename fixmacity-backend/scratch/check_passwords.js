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

async function checkPasswords() {
  const users = [
    { email: 'president@sousse.tn', role: 'President' },
    { email: 'chef.voirie@sousse.tn', role: 'Chef' },
    { email: 'agent2.voirie@sousse.tn', role: 'Agent' },
    { email: 'ahmed@test.com', role: 'Citizen' }
  ];

  const testPasswords = ['Admin1234!', 'Admin123!', 'Password123!', 'password123'];

  for (const user of users) {
    console.log(`Checking user: ${user.email} (${user.role})`);
    const res = await pool.query("SELECT password_hash FROM users WHERE email = $1", [user.email]);
    if (res.rows.length === 0) {
      console.log('User not found');
      continue;
    }
    const hash = res.rows[0].password_hash;
    let found = false;
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, hash);
      if (match) {
        console.log(`✅ Password found: ${pwd}`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log('❌ No standard password matched.');
    }
    console.log('---');
  }
  await pool.end();
}

checkPasswords();
