const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Citizen', 'Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split(/\r?\n/);

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Status helpers') && lines[i].includes('STATUS_MAP')) {
    startIndex = i;
  }
  if (startIndex !== -1 && lines[i] === '}' && lines[i - 1] && lines[i - 1].includes('return 0')) {
    endIndex = i;
    break;
  }
}

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find target block!');
  process.exit(1);
}

const replacement = `// ✨ Status helpers ✨
const STATUS_MAP: Record<string, { label: string; textClass: string; bgClass: string; dotClass: string }> = {
  'SOUMISE':  { label: 'Soumise',  textClass: 'text-amber-600 dark:text-amber-400',  bgClass: 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200/10',  dotClass: 'bg-amber-500' },
  'EN COURS': { label: 'En cours', textClass: 'text-blue-600 dark:text-blue-400',   bgClass: 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200/10',   dotClass: 'bg-[#1557FF]' },
  'ÉVALUÉ':   { label: 'Évalué',   textClass: 'text-green-600 dark:text-green-400',  bgClass: 'bg-green-50 dark:bg-green-950/30 border border-green-200/10',  dotClass: 'bg-green-500' },
  'CLÔTURÉ':  { label: 'Clôturé',  textClass: 'text-slate-600 dark:text-slate-400',  bgClass: 'bg-slate-50 dark:bg-slate-950/30 border border-slate-200/10',  dotClass: 'bg-slate-500' },
}

// ✨ Status timeline steps ✨
const TIMELINE_STEPS = ['Soumise', 'En cours', 'Évalué', 'Clôturé']

function getStepIndex(status: string) {
  if (status === 'SOUMISE') return 1
  if (status === 'EN COURS') return 2
  if (status === 'ÉVALUÉ') return 3
  if (status === 'CLÔTURÉ') return 4
  return 0
}`;

lines.splice(startIndex, endIndex - startIndex + 1, replacement);
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Successfully fixed Dashboard.tsx!');
