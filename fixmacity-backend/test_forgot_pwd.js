const axios = require('axios');

async function test() {
  try {
    console.log('Sending forgot-password request...');
    const res = await axios.post('http://localhost:5005/api/auth/forgot-password', {
      email: 'molkabenhmida29@gmail.com'
    });
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

test();
