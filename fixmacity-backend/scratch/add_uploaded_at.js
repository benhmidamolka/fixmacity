require('dotenv').config();
const supabase = require('../src/config/db');

async function run() {
  try {
    await supabase.pool.query(`
      ALTER TABLE declaration_photos 
      ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);
    console.log('Successfully added uploaded_at column to declaration_photos.');
    process.exit(0);
  } catch (err) {
    console.error('Error adding column:', err);
    process.exit(1);
  }
}

run();
