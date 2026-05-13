const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost', port: 5432,
  database: 'fixmacity', user: 'postgres',
  password: '98452169.PApa'
});

async function main() {
  const newPassword = 'Admin1234!';
  const hash = await bcrypt.hash(newPassword, 10);
  
  const result = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, first_name, last_name, role",
    [hash, 'chef.voirie@sousse.tn']
  );
  
  if (result.rows.length > 0) {
    const u = result.rows[0];
    console.log(`✅ Password reset for: ${u.first_name} ${u.last_name} (${u.email}) - role: ${u.role}`);
    console.log(`   New password: ${newPassword}`);
  } else {
    console.log('❌ User not found');
  }
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
