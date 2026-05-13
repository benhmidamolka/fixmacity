// Quick smoke test for auth endpoints
const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 5005,
      path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        console.log(`${path} => ${res.statusCode}`);
        try { console.log(JSON.parse(buf)); } catch { console.log(buf); }
        resolve({ status: res.statusCode, body: buf });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  // Test 1: Login with president
  console.log('\n=== TEST 1: President Login ===');
  const login = await post('/api/auth/login', {
    email: 'president@sousse.tn',
    password: 'Password123!'
  });

  if (login.status === 200) {
    const { token } = JSON.parse(login.body);
    
    // Test 2: /auth/me with token
    console.log('\n=== TEST 2: Auth Me ===');
    await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost', port: 5005,
        path: '/api/auth/me', method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      }, (res) => {
        let buf = '';
        res.on('data', c => buf += c);
        res.on('end', () => {
          console.log(`/api/auth/me => ${res.statusCode}`);
          try { console.log(JSON.parse(buf)); } catch { console.log(buf); }
          resolve();
        });
      });
      req.on('error', reject);
      req.end();
    });

    // Test 3: President dashboard
    console.log('\n=== TEST 3: President Dashboard ===');
    await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost', port: 5005,
        path: '/api/president/dashboard', method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      }, (res) => {
        let buf = '';
        res.on('data', c => buf += c);
        res.on('end', () => {
          console.log(`/api/president/dashboard => ${res.statusCode}`);
          try { console.log(JSON.parse(buf)); } catch { console.log(buf); }
          resolve();
        });
      });
      req.on('error', reject);
      req.end();
    });

    // Test 4: President departments list
    console.log('\n=== TEST 4: Departments ===');
    await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost', port: 5005,
        path: '/api/president/departments', method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      }, (res) => {
        let buf = '';
        res.on('data', c => buf += c);
        res.on('end', () => {
          console.log(`/api/president/departments => ${res.statusCode}`);
          try { console.log(JSON.parse(buf)); } catch { console.log(buf); }
          resolve();
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  console.log('\n=== ALL TESTS COMPLETE ===');
})();
