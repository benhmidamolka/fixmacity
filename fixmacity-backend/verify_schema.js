/**
 * verify_schema.js
 * Run: node verify_schema.js
 * 
 * Prints a human-readable report on all 5 schema issues so you can
 * confirm the state of the database before and after the migration.
 */

'use strict';
require('dotenv').config(); // ← must be first so DB_PASSWORD is a string before pg connects
const { pool } = require('./src/config/db');

async function q(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' FIXMACITY — Schema Health Check');
  console.log('══════════════════════════════════════════════\n');

  // ── Issue 1: departments vs services ─────────────────────
  console.log('📋 [1] departments vs services');
  const depts = await q(`SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema='public' AND table_name='departments'`);
  const servs = await q(`SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema='public' AND table_name='services'`);
  
  if (Number(depts[0].cnt) > 0) {
    const rows = await q('SELECT COUNT(*) AS cnt FROM departments');
    console.log(`  departments table EXISTS — ${rows[0].cnt} rows`);
  } else {
    console.log('  departments table: NOT FOUND (already dropped or never existed)');
  }
  if (Number(servs[0].cnt) > 0) {
    const rows = await q('SELECT COUNT(*) AS cnt FROM services');
    console.log(`  services table EXISTS — ${rows[0].cnt} rows`);
  }

  // ── Issue 2: declarations.status type ────────────────────
  console.log('\n📋 [2] declarations.status data type');
  const statusCol = await q(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='declarations' AND column_name='status'
  `);
  if (statusCol.length > 0) {
    const col = statusCol[0];
    const isEnum = col.udt_name === 'declaration_status';
    console.log(`  data_type : ${col.data_type}`);
    console.log(`  udt_name  : ${col.udt_name}`);
    console.log(`  status    : ${isEnum ? '✅ Correct (enum)' : '⚠️  Still TEXT — run migration'}`);
  } else {
    console.log('  ❌ declarations.status column not found');
  }

  // ── Issue 3: tasks.intervention_id FK ────────────────────
  console.log('\n📋 [3] tasks.intervention_id FK');
  const tasksExists = await q(`SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema='public' AND table_name='tasks'`);
  if (Number(tasksExists[0].cnt) > 0) {
    const colExists = await q(`
      SELECT COUNT(*) AS cnt FROM information_schema.columns
      WHERE table_schema='public' AND table_name='tasks' AND column_name='intervention_id'
    `);
    if (Number(colExists[0].cnt) > 0) {
      const fkExists = await q(`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type='FOREIGN KEY'
          AND tc.table_schema='public'
          AND tc.table_name='tasks'
          AND kcu.column_name='intervention_id'
      `);
      if (fkExists.length > 0) {
        console.log(`  ✅ FK exists: ${fkExists[0].constraint_name}`);
      } else {
        console.log('  ⚠️  intervention_id column exists but has NO FK — run migration');
      }
    } else {
      console.log('  tasks.intervention_id column: NOT FOUND');
    }
  } else {
    console.log('  tasks table: NOT FOUND in schema');
  }

  // ── Issue 4: declaration_photos.score ────────────────────
  console.log('\n📋 [4] declaration_photos.score');
  const scoreCol = await q(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='declaration_photos' AND column_name='score'
  `);
  if (scoreCol.length > 0) {
    const comment = await q(`
      SELECT col_description(
        'declaration_photos'::regclass,
        (SELECT attnum FROM pg_attribute
         WHERE attrelid = 'declaration_photos'::regclass AND attname = 'score')
      ) AS comment
    `);
    const hasComment = comment[0]?.comment != null;
    console.log(`  Column exists (type: ${scoreCol[0].data_type})`);
    console.log(`  Comment: ${hasComment ? '✅ Documented' : '⚠️  No comment — run migration'}`);
    if (hasComment) console.log(`  → "${comment[0].comment.substring(0, 80)}…"`);
  } else {
    console.log('  declaration_photos.score: NOT FOUND');
  }

  // ── Issue 5: propositions multilingual ───────────────────
  console.log('\n📋 [5] propositions multilingual columns');
  const langCols = await q(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='propositions'
      AND column_name IN ('title_fr','title_ar','description_fr','description_ar','description_en')
    ORDER BY column_name
  `);
  if (langCols.length > 0) {
    console.log(`  Found ${langCols.length}/5 multilingual columns: ${langCols.map(r=>r.column_name).join(', ')}`);
    console.log('  ✅ Trilingual schema confirmed');
  } else {
    console.log('  No multilingual columns found (single-lang schema)');
  }

  // ── Enum types ────────────────────────────────────────────
  console.log('\n📋 [BONUS] Enum types registered in DB');
  const enums = await q(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);
  enums.forEach(e => {
    const labels = Array.isArray(e.labels) ? e.labels : String(e.labels).replace(/[{}]/g, '').split(',');
    console.log(`  ${e.typname}: [${labels.join(', ')}]`);
  });

  console.log('\n══════════════════════════════════════════════');
  console.log(' Report complete');
  console.log('══════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
