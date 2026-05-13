require('dotenv').config();
const { pool } = require('./src/config/db');
const fetch = require('node-fetch');

async function main() {
  try {
    const { rows } = await pool.query("SELECT email FROM users WHERE role = 'citizen' LIMIT 1");
    const email = rows[0].email;
    const loginRes = await fetch('http://localhost:5005/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' })
    });
    const loginData = await loginRes.json();
    const mapRes = await fetch('http://localhost:5005/api/declarations/map', {
      headers: { 'Authorization': 'Bearer ' + loginData.token }
    });
    const mapData = await mapRes.json();
    if (mapData.declarations && mapData.declarations.length > 0) {
       console.log('Sample declaration keys:', Object.keys(mapData.declarations[0]));
       console.log('Sample declaration status:', mapData.declarations[0].status);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
