const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function checkDeclarations() {
  try {
    const res = await pool.query(
      `SELECT id, ref_citoyen, title, status, created_at 
       FROM declarations 
       WHERE is_deleted = false
       ORDER BY created_at DESC 
       LIMIT 10;`
    );
    
    console.log('✅ Recent Declarations:\n');
    res.rows.forEach((row, i) => {
      console.log(`${i + 1}. [${row.status}] ${row.ref_citoyen} - ${row.title} (${row.id.slice(0, 8)}...)`);
    });
    
    // Find declarations NOT in soumise status
    const nonSubmitted = res.rows.filter(r => r.status !== 'soumise');
    if (nonSubmitted.length > 0) {
      console.log(`\n⚠️  Found ${nonSubmitted.length} declarations NOT in 'soumise' status:`);
      nonSubmitted.forEach(d => {
        console.log(`   - ${d.ref_citoyen}: ${d.status}`);
      });
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkDeclarations();
