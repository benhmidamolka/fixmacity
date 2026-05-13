require('dotenv').config();
const axios = require('axios');

async function testApi() {
  try {
    console.log('Attempting login...');
    const loginRes = await axios.post('http://localhost:5005/api/auth/login', {
      email: 'president@sousse.tn',
      password: 'Password123!'
    });
    
    const token = loginRes.data.token;
    console.log('Login successful. Token:', token.slice(0, 10) + '...');
    
    console.log('Fetching dashboard data...');
    const dashRes = await axios.get('http://localhost:5005/api/president/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Dashboard Data:', JSON.stringify(dashRes.data, null, 2));
    
  } catch (err) {
    console.error('API Error:', err.response?.data || err.message);
  }
}

testApi();
