require('dotenv').config();
const db = require('../src/config/db');

async function run() {
  try {
    await db.pool.query("UPDATE declaration_photos SET photo_type = 'before' WHERE photo_type = 'photo_avant'");
    await db.pool.query("ALTER TABLE declaration_photos DROP CONSTRAINT IF EXISTS declaration_photos_photo_type_check");
    await db.pool.query("ALTER TABLE declaration_photos ADD CONSTRAINT declaration_photos_photo_type_check CHECK (photo_type IN ('citizen', 'before', 'after', 'proof'))");
    console.log("Success");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
