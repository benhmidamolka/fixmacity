const axios = require('axios');

async function testRegister() {
  try {
    const payload = {
      first_name: 'Test',
      last_name: 'Citizen',
      email: `test.citizen.${Date.now()}@example.com`,
      password: 'Password123!',
      delegation_id: 'a309fed2-6c50-49ae-b2be-a6e7ccd096df',
      language: 'FR'
    };
    
    console.log('Sending payload:', payload);
    const res = await axios.post('http://localhost:5005/api/auth/register', payload);
    console.log('Status:', res.status);
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Error Status:', err.response?.status);
    console.error('Error Response:', err.response?.data);
    console.error('Error Message:', err.message);
  }
}

testRegister();
