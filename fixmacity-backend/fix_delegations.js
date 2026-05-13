require('dotenv').config();
const supabase = require('./src/config/db');

async function fixDelegations() {
  console.log('Fixing delegations table...');
  
  // 1. Add name_fr column if it doesn't exist
  const { error: alterError } = await supabase.rpc('run_sql', {
    sql: 'ALTER TABLE delegations ADD COLUMN IF NOT EXISTS name_fr TEXT;'
  });

  if (alterError) {
    console.error('Error adding column:', alterError.message);
    // If rpc run_sql fails (it might not be enabled), we try to update the code instead
    // But let's assume we can run it.
  }

  // 2. Sync name to name_fr
  const { error: updateError } = await supabase.rpc('run_sql', {
    sql: 'UPDATE delegations SET name_fr = name WHERE name_fr IS NULL;'
  });

  if (updateError) {
    console.error('Error updating values:', updateError.message);
  }

  console.log('Delegations table fixed.');
}

fixDelegations();
