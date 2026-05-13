const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 5005,
      path: '/api' + path, method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Content-Length': Buffer.byteLength(data),
        'Authorization': token ? `Bearer ${token}` : ''
      },
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        console.log(`POST ${path} => ${res.statusCode}`);
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); } catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 5005,
      path: '/api' + path, method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        console.log(`GET ${path} => ${res.statusCode}`);
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); } catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  console.log('\n=== WORKFLOW TEST START ===');
  
  // 1. Login
  const loginRes = await post('/auth/login', { email: 'president@sousse.tn', password: 'Password123!' });
  const token = loginRes.body.token;
  
  // 2. Get Dashboard Stats Before
  console.log('\n--- Stats Before ---');
  const statsBefore = await get('/president/dashboard', token);
  console.log('Total Soumises:', statsBefore.body.stats.by_status.soumise);
  
  // 3. Get Declarations to find a "soumise" one
  const declsRes = await get('/president/declarations?status=soumise', token);
  const declToAssign = declsRes.body.declarations[0];
  
  if (!declToAssign) {
    console.log('No "soumise" declaration found to assign.');
    return;
  }
  
  console.log(`\nAssigning Declaration: ${declToAssign.id} (${declToAssign.title})`);
  
  // 4. Get Departments
  const deptsRes = await get('/president/departments', token);
  const deptId = deptsRes.body.departments[0].id; // Assign to first dept
  
  // 5. Assign (Correct Route)
  const assignRes = await post(`/president/declarations/${declToAssign.id}/assign`, {
    department_id: deptId,
    priority: 'High'
  }, token);
  
  console.log('Assignment Result:', assignRes.body);
  
  // 6. Get Dashboard Stats After
  console.log('\n--- Stats After ---');
  const statsAfter = await get('/president/dashboard', token);
  console.log('Total Soumises:', statsAfter.body.stats.by_status.soumise);
  
  console.log('\n=== WORKFLOW TEST COMPLETE ===');
})();
