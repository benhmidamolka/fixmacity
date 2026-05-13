require('dotenv').config();
const supabase = require('./src/config/db');

async function checkUser() {
  const email = 'chef.voirie@sousse.tn';
  console.log(`Checking user: ${email}`);
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, is_active, department_id, first_name, last_name')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user:', error.message);
    return;
  }

  if (!data) {
    console.log('User not found.');
    
    // List some users to see what's there
    const { data: users } = await supabase
      .from('users')
      .select('email, role')
      .limit(10);
    console.log('Sample users in DB:', users);
  } else {
    console.log('User found:', data);
  }
}

checkUser();
