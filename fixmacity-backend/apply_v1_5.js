'use strict';
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'v1_5_updates.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Applying v1.5 updates...');
    await pool.query(sql);
    console.log('Success!');
  } catch (err) {
    console.error('Error applying SQL:', err);
  } finally {
    await pool.end();
  }
}

run();
