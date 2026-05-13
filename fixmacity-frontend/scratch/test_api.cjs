const axios = require('axios');

async function test() {
  try {
    const login = await axios.post('http://localhost:5005/api/auth/login', {
      email: 'president@fixmacity.tn', // Assuming this is the email
      password: 'password123' // Assuming this is the password
    });
    
    const token = login.data.token;
    console.log('Login success, token obtained');

    const dashboard = await axios.get('http://localhost:5005/api/president/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Dashboard Data:', JSON.stringify(dashboard.data, null, 2));
  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
  }
}

test();
