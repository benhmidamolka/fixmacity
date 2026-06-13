const fs = require('fs');
const path = 'fixmacity-frontend/src/pages/Chef/ChefDeclarations.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  "import ChefLayout from '../../layouts/ChefLayout'",
  "import ChefLayout from '../../layouts/ChefLayout'\nimport { DetailDrawer, AcceptModal, RefuseModal } from '../../components/Chef/DetailDrawer'"
);

const startStr = '// ── Assign Agent Modal ────────────────────────────────────────────────────────';
const endStr = '// ── Main Page ─────────────────────────────────────────────────────────────────';
const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + content.slice(endIndex);
  console.log('Removed inline Modals and Drawer.');
} else {
  console.log('Could not find start/end comments for inline components.');
}

content = content.replace(
  '{selected && <DetailDrawer decl={selected} agents={agents} onClose={() => setSelected(null)} onRefreshed={() => { load(true); setSelected(null) }} />}',
  '{selected && <DetailDrawer declId={selected.id} agents={agents} onClose={() => setSelected(null)} onRefreshed={() => { load(true); setSelected(null) }} />}'
);

content = content.replace(
  '{assigning && <AssignModal decl={assigning} agents={agents} onClose={() => setAssigning(null)} onDone={() => load(true)} />}',
  '{assigning && <AcceptModal decl={assigning} agents={agents} onClose={() => setAssigning(null)} onDone={() => load(true)} />}'
);

fs.writeFileSync(path, content, 'utf-8');
console.log('Done replacing.');
