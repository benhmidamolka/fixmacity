const fs = require('fs');
const path = require('path');

const sourcePath = 'C:\\Users\\Client\\OneDrive\\Bureau\\Fixmacity\\fixmacity-frontend\\src\\pages\\Chef\\ChefDeclarationDetail.tsx';
const targetPath = 'C:\\Users\\Client\\OneDrive\\Bureau\\Fixmacity\\fixmacity-frontend\\src\\components\\Chef\\DetailDrawer.tsx';

const content = fs.readFileSync(sourcePath, 'utf8');
const lines = content.split('\n');

// Find the end of DetailDrawer (line 856 or 857)
const endIndex = lines.findIndex(l => l.includes('// MAIN PAGE')) - 1;

let drawerLines = lines.slice(0, endIndex);

// Remove ChefLayout import
drawerLines = drawerLines.filter(l => !l.includes('import ChefLayout'));

// Add export to RefuseModal
drawerLines = drawerLines.map(l => l.replace('function RefuseModal', 'export function RefuseModal'));

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, drawerLines.join('\n'));

console.log('Extracted ' + drawerLines.length + ' lines to ' + targetPath);
