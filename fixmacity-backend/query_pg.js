const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fixmacity',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '98452169.PApa',
  });

  try {
    await client.connect();
    
    console.log("--- Query 2: SELECT DISTINCT type FROM propositions ---");
    const res = await client.query("SELECT DISTINCT type FROM propositions;");
    console.table(res.rows);
    console.table(res.rows);

  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

run();
