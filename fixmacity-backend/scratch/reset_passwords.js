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

async function main() {
  const staffPwd = 'Admin1234!';
  const citizenPwd = 'Citizen1234!';
  
  const staffHash = await bcrypt.hash(staffPwd, 12);
  const citizenHash = await bcrypt.hash(citizenPwd, 12);
  
  const accounts = [
    { email: 'president@sousse.tn', role: 'president', hash: staffHash, pwd: staffPwd },
    { email: 'chef.voirie@sousse.tn', role: 'chef', hash: staffHash, pwd: staffPwd },
    { email: 'chef.eclairage@sousse.tn', role: 'chef', hash: staffHash, pwd: staffPwd },
    { email: 'agent.voirie@sousse.tn', role: 'agent', hash: staffHash, pwd: staffPwd },
    { email: 'agent2.voirie@sousse.tn', role: 'agent', hash: staffHash, pwd: staffPwd },
    { email: 'citizen_test@sousse.tn', role: 'citizen', hash: citizenHash, pwd: citizenPwd },
    { email: 'sami.citizen@gmail.com', role: 'citizen', hash: citizenHash, pwd: citizenPwd },
  ];
  
  console.log('Resetting passwords in database...');
  
  for (const acc of accounts) {
    try {
      const res = await pool.query(
        "UPDATE users SET password_hash = $1, is_active = true WHERE email = $2 RETURNING id, email, role, first_name, last_name",
        [acc.hash, acc.email]
      );
      if (res.rowCount > 0) {
        const u = res.rows[0];
        console.log(`✅ Reset password for ${u.role}: ${u.first_name} ${u.last_name} (${u.email}) -> password: ${acc.pwd}`);
      } else {
        console.log(`⚠️ User not found for update: ${acc.email} (${acc.role})`);
      }
    } catch (err) {
      console.error(`❌ Error resetting password for ${acc.email}:`, err.message);
    }
  }
  
  await pool.end();
}

main().catch(console.error);
