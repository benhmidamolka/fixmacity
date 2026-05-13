require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./src/config/db');

async function reset() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('Chef1234!', salt);
    const res = await db.pool.query('UPDATE "users" SET password_hash = $1 WHERE email = $2', [hashed, 'chef.voirie@sousse.tn']);
    console.log('Updated:', res.rowCount);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
reset();
