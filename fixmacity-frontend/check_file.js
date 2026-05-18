const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Citizen', 'Dashboard.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

for (let i = 0; i < 30; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
