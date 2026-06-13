const fs = require('fs');

const file = 'C:\\Users\\Client\\OneDrive\\Bureau\\Fixmacity\\fixmacity-frontend\\src\\pages\\Chef\\ChefDeclarations.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('export function AcceptModal'));
const endIndex = lines.findIndex(l => l.includes('// MAIN PAGE')) - 2;

if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1, 
    "import { AcceptModal, RefuseModal, DetailDrawer, DetailDrawerProps } from '../../components/Chef/DetailDrawer';");
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Successfully replaced lines in ChefDeclarationDetail.tsx');
} else {
  console.log('Could not find start or end index', startIndex, endIndex);
}
