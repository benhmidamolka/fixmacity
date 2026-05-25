require('dotenv').config();
const db = require('../src/config/db');

async function run() {
  try {
    // Let's check status of a declaration
    const { data, error } = await db.from('declarations').select('id, status').limit(1);
    if (error) {
      console.error('Error fetching declaration:', error);
      return;
    }
    if (data.length === 0) {
      console.log('No declarations found');
      return;
    }
    const testDecl = data[0];
    console.log('Current status:', testDecl.status);
    
    // Try updating to 'en_cours' (which should work)
    const { error: err1 } = await db.from('declarations').update({ status: 'en_cours' }).eq('id', testDecl.id);
    console.log('Update to en_cours error status:', err1 ? err1.message : 'SUCCESS');
    
    // Try updating to a custom status 'waiting_material'
    const { error: err2 } = await db.from('declarations').update({ status: 'waiting_material' }).eq('id', testDecl.id);
    console.log('Update to waiting_material error status:', err2 ? err2.message : 'SUCCESS');
    
    // Revert back
    await db.from('declarations').update({ status: testDecl.status }).eq('id', testDecl.id);
  } catch (err) {
    console.error('Catch error:', err);
  }
}

run();
