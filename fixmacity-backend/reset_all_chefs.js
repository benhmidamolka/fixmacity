require('dotenv').config();
const supabase = require('./src/config/db');
const bcrypt = require('bcrypt');

async function resetAllChefs() {
  const emails = [
    'chef.voirie@sousse.tn',
    'chef.eclairage@sousse.tn',
    'chef.proprete@sousse.tn',
    'chef.espaces@sousse.tn'
  ];
  const newPassword = 'Chef1234!';
  
  console.log(`Resetting passwords to: ${newPassword}`);
  
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  for (const email of emails) {
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('email', email)
      .select('email');

    if (error) {
      console.error(`Error updating ${email}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`Success: ${email}`);
    } else {
      console.log(`User not found: ${email}`);
    }
  }
}

resetAllChefs();
