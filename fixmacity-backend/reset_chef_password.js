require('dotenv').config();
const supabase = require('./src/config/db');
const bcrypt = require('bcrypt');

async function resetPassword() {
  const email = 'chef.voirie@sousse.tn';
  const newPassword = 'Admin123!';
  
  console.log(`Resetting password for: ${email}`);
  
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  const { data, error } = await supabase
    .from('users')
    .update({ password_hash: hashedPassword })
    .eq('email', email)
    .select('email');

  if (error) {
    console.error('Error updating password:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('Password reset successful for:', data[0].email);
  } else {
    console.log('User not found or not updated.');
  }
}

resetPassword();
