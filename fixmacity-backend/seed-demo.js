'use strict';
require('dotenv').config();
const axios = require('axios');

const BASE = 'http://localhost:5005/api';
const DELAY = 250;
const RESET = process.argv.includes('--reset');

// ── Dept IDs ──────────────────────────────────────────────────
const DEPT = {
  voirie:   'c3c9d2cd-4b55-481b-b577-92ae1ee7d8d1',
  eclairage:'af6c8348-0e2b-40fe-b4aa-54629d483559',
  proprete: '5ab878b9-2d37-455e-b8cf-7fe91dd5e088',
  espaces:  'f6c86d36-3e26-442f-9e3f-2b745083109f',
  reseaux:  null, // fetched dynamically
  signal:   null,
};

// ── Delegation IDs ─────────────────────────────────────────────
const DELEG = {
  nord:   'a309fed2-6c50-49ae-b2be-a6e7ccd096df',
  sud:    '0ede6556-2f67-4a0d-a7cb-d0cdca4504a5',
  medina: 'a1ca5994-b186-4970-91f6-c44925cfc4b4',
  riadh:  'b2da6994-c286-4970-91f6-c44925cfc4b5',
};

// ── Helpers ───────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, fail = 0;

function log(emoji, msg) { console.log(`${emoji}  ${msg}`); }

async function api(method, path, data, token) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await axios({ method, url: BASE + path, data, headers });
    await sleep(DELAY);
    return res.data;
  } catch (e) {
    const code = e.response?.status;
    const msg  = e.response?.data?.error || e.message;
    if (code === 409) { log('⚠️ ', `SKIP (exists): ${path}`); return null; }
    log('❌', `${method.toUpperCase()} ${path} → [${code}] ${msg}`);
    fail++;
    return null;
  }
}

const FormData = require('form-data');
const fs = require('fs');
async function apiMultipart(path, token, filePath) {
  try {
    const form = new FormData();
    form.append('photo', fs.createReadStream(filePath));
    const res = await axios.post(BASE + path, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` }
    });
    await sleep(DELAY);
    return res.data;
  } catch (e) {
    const code = e.response?.status;
    const msg  = e.response?.data?.error || e.message;
    log('❌', `UPLOAD ${path} → [${code}] ${msg}`);
    fail++;
    return null;
  }
}

async function login(email, password) {
  const res = await api('post', '/auth/login', { email, password });
  return res?.token || null;
}

// ── STEP 1: Fetch dynamic dept IDs ────────────────────────────
async function fetchDepts(presidentToken) {
  const res = await api('get', '/president/departments', null, presidentToken);
  if (!res?.departments) return;
  for (const d of res.departments) {
    const n = (d.name_fr || d.name || '').toLowerCase();
    if (n.includes('réseau') || n.includes('reseau') || n.includes('drainage'))
      DEPT.reseaux = d.id;
    if (n.includes('signal'))
      DEPT.signal = d.id;
  }
  log('✅', `Departments loaded. Réseaux=${DEPT.reseaux} Signal=${DEPT.signal}`);
}

// ── STEP 2: Create accounts ────────────────────────────────────
const CHEFS = [
  { email:'chef.voirie@sousse.tn',   password:'Chef1234!', first_name:'Karim',   last_name:'Mansour',  role:'chef', department_id: DEPT.voirie   },
  { email:'chef.eclairage@sousse.tn',password:'Chef1234!', first_name:'Sonia',   last_name:'Dridi',    role:'chef', department_id: DEPT.eclairage },
  { email:'chef.proprete@sousse.tn', password:'Chef1234!', first_name:'Mohamed', last_name:'Chaabani', role:'chef', department_id: DEPT.proprete  },
  { email:'chef.espaces@sousse.tn',  password:'Chef1234!', first_name:'Leila',   last_name:'Bouzid',   role:'chef', department_id: DEPT.espaces   },
];

const AGENTS = [
  { email:'agent.aymen@sousse.tn', password:'Agent1234!', first_name:'Aymen', last_name:'Ben Ali',   role:'agent', department_id: DEPT.voirie   },
  { email:'agent.omar@sousse.tn',  password:'Agent1234!', first_name:'Omar',  last_name:'Sassi',     role:'agent', department_id: DEPT.voirie   },
  { email:'agent.imen@sousse.tn',  password:'Agent1234!', first_name:'Imen',  last_name:'Ghrabi',    role:'agent', department_id: DEPT.eclairage },
  { email:'agent.riadh@sousse.tn', password:'Agent1234!', first_name:'Riadh', last_name:'Hamdi',     role:'agent', department_id: DEPT.proprete  },
  { email:'agent.amira@sousse.tn', password:'Agent1234!', first_name:'Amira', last_name:'Trabelsi',  role:'agent', department_id: DEPT.espaces   },
];

const CITIZENS = [
  { email:'sami.citizen@gmail.com',  password:'Citoyen123!', first_name:'Sami',  last_name:'Ben Youssef', delegation_id: DELEG.nord   },
  { email:'ines.citizen@gmail.com',  password:'Citoyen123!', first_name:'Ines',  last_name:'Mansour',     delegation_id: DELEG.sud    },
  { email:'ahmed.citizen@gmail.com', password:'Citoyen123!', first_name:'Ahmed', last_name:'Kamel',       delegation_id: DELEG.medina },
  { email:'fatma.citizen@gmail.com', password:'Citoyen123!', first_name:'Fatma', last_name:'Ben Salah',   delegation_id: DELEG.riadh  },
  { email:'nour.citizen@gmail.com',  password:'Citoyen123!', first_name:'Nour',  last_name:'Chakroun',    delegation_id: DELEG.nord   },
];

async function createAccounts(presToken) {
  if (RESET) { log('⏭️ ', 'RESET mode: skipping account creation'); return; }
  log('\n📋', 'Creating Chefs...');
  for (const u of CHEFS) {
    const r = await api('post', '/president/users', u, presToken);
    if (r?.user) { log('✅', `Chef created: ${u.email}`); ok++; }
  }
  log('\n📋', 'Creating Agents...');
  for (const u of AGENTS) {
    const r = await api('post', '/president/users', u, presToken);
    if (r?.user) { log('✅', `Agent created: ${u.email}`); ok++; }
  }
  log('\n📋', 'Creating Citizens...');
  for (const u of CITIZENS) {
    const r = await api('post', '/auth/register', u);
    if (r?.token || r?.user) { log('✅', `Citizen created: ${u.email}`); ok++; }
  }
}

// ── STEP 3: Create Declarations ───────────────────────────────
const DECL_DATA = [
  // sami (0-2)
  { title:"Nid-de-poule dangereux Av. Bourguiba", description:"Un nid-de-poule profond s'est formé suite aux dernières pluies. Risque important pour les deux-roues.", category:"Voirie", delegation_id:DELEG.nord, latitude:35.8256, longitude:10.6369 },
  { title:"Lampadaire cassé Rue Hedi Chaker", description:"Le lampadaire au coin de la rue est cassé depuis 3 jours. La zone est sombre la nuit.", category:"Eclairage", delegation_id:DELEG.nord, latitude:35.8301, longitude:10.6412 },
  { title:"Dépôt sauvage derrière le marché", description:"Des ordures s'accumulent derrière le marché central depuis une semaine. Odeurs nauséabondes.", category:"Proprete", delegation_id:DELEG.medina, latitude:35.8278, longitude:10.6389 },
  // ines (3-5)
  { title:"Trottoir effondré Av. Taïeb Mhiri", description:"Une section du trottoir s'est effondrée, danger pour les piétons notamment les personnes âgées.", category:"Voirie", delegation_id:DELEG.sud, latitude:35.8445, longitude:10.5912 },
  { title:"Arbre tombé bloque la rue", description:"Suite aux vents violents, un arbre est tombé et bloque partiellement la circulation. Urgent.", category:"Espaces verts", delegation_id:DELEG.sud, latitude:35.8412, longitude:10.5934 },
  { title:"Fuite d'eau importante Rue Ibn Sina", description:"Une fuite d'eau jaillit depuis 2 jours au milieu de la chaussée formant une mare.", category:"Reseaux", delegation_id:DELEG.sud, latitude:35.8398, longitude:10.5956 },
  // ahmed (6-7)
  { title:"Bac à ordures débordant Cité Erriadh", description:"Les bacs n'ont pas été vidés depuis 5 jours. Les déchets débordent sur la voie publique.", category:"Proprete", delegation_id:DELEG.riadh, latitude:35.7823, longitude:10.6145 },
  { title:"Signalisation manquante carrefour dangereux", description:"Le panneau stop a disparu. Plusieurs quasi-accidents signalés par les riverains.", category:"Signalisation", delegation_id:DELEG.riadh, latitude:35.7845, longitude:10.6167 },
  // fatma (8-9)
  { title:"Éclairage public en panne Av. Mohamed V", description:"Toute une section est sombre. Environ 8 lampadaires hors service depuis 4 jours.", category:"Eclairage", delegation_id:DELEG.nord, latitude:35.8334, longitude:10.6423 },
  { title:"Graffitis sur le mur de l'école", description:"Des graffitis obscènes ont été tagués sur le mur de l'école primaire Bourguiba.", category:"Administratif", delegation_id:DELEG.nord, latitude:35.8312, longitude:10.6401 },
  // nour (10-14)
  { title:"Parc dégradé Jardin Municipal", description:"Les bancs du jardin municipal sont cassés, les jeux pour enfants sont rouillés et dangereux.", category:"Espaces verts", delegation_id:DELEG.sud, latitude:35.8467, longitude:10.5923 },
  { title:"Affaissement de chaussée Rue Farhat", description:"Un affaissement dangereux s'est créé. La nuit il est invisible, plusieurs voitures endommagées.", category:"Voirie", delegation_id:DELEG.sud, latitude:35.8489, longitude:10.5945 },
  { title:"Câble électrique exposé Rue de Marseille", description:"Un câble pend dangereusement à hauteur d'homme. Risque d'électrocution immédiat.", category:"Eclairage", delegation_id:DELEG.sud, latitude:35.8478, longitude:10.5967 },
  { title:"Drainage bouché inondation récurrente", description:"La bouche d'égout est bouchée. A chaque pluie la rue est inondée sur 50 mètres.", category:"Reseaux", delegation_id:DELEG.sud, latitude:35.8456, longitude:10.5912 },
  { title:"Poteau téléphonique penché dangereux", description:"Un poteau est fortement incliné et menace de tomber sur la voie publique.", category:"Reseaux", delegation_id:DELEG.medina, latitude:35.8289, longitude:10.6378 },
];

async function createDeclarations(tokens) {
  const ids = [];
  const groups = [
    { token: tokens.sami,  decls: [0,1,2] },
    { token: tokens.ines,  decls: [3,4,5] },
    { token: tokens.ahmed, decls: [6,7] },
    { token: tokens.fatma, decls: [8,9] },
    { token: tokens.nour,  decls: [10,11,12,13,14] },
  ];
  log('\n📢', 'Creating Declarations...');
  for (const g of groups) {
    for (const i of g.decls) {
      const r = await api('post', '/declarations', DECL_DATA[i], g.token);
      if (r?.declaration) {
        ids[i] = r.declaration.id;
        log('✅', `Decl ${i+1}: ${DECL_DATA[i].title.slice(0,40)}...`);
        ok++;
      } else {
        ids[i] = null;
      }
    }
  }
  return ids;
}

// ── STEP 4A: President assigns ────────────────────────────────
async function presidentAssigns(presToken, ids, agentIds) {
  log('\n👑', 'President assigning declarations...');
  const assignments = [
    [0, DEPT.voirie], [1, DEPT.eclairage], [2, DEPT.proprete],
    [3, DEPT.voirie], [4, DEPT.espaces],   [5, DEPT.reseaux],
    [6, DEPT.proprete],[8, DEPT.eclairage],[10,DEPT.espaces],
    [11,DEPT.voirie],
  ];
  for (const [i, deptId] of assignments) {
    if (!ids[i] || !deptId) { log('⚠️ ', `Skip assign decl ${i+1}: no ID or dept`); continue; }
    const r = await api('post', `/president/declarations/${ids[i]}/assign`, { department_id: deptId }, presToken);
    if (r?.declaration) { log('✅', `Assigned decl ${i+1} → dept`); ok++; }
  }
}

// ── STEP 4B: Chefs accept ─────────────────────────────────────
async function chefsAccept(tokens, ids, agentIds) {
  log('\n👨‍💼', 'Chefs accepting declarations...');
  const actions = [
    { token: tokens.chefVoirie,   decl: 0,  agentId: agentIds.aymen },
    { token: tokens.chefVoirie,   decl: 3,  agentId: agentIds.omar  },
    { token: tokens.chefVoirie,   decl: 11, agentId: agentIds.aymen },
    { token: tokens.chefEcl,      decl: 1,  agentId: agentIds.imen  },
    { token: tokens.chefEcl,      decl: 8,  agentId: agentIds.imen  },
    { token: tokens.chefProprete, decl: 2,  agentId: agentIds.riadh },
    { token: tokens.chefProprete, decl: 6,  agentId: agentIds.riadh },
    { token: tokens.chefEspaces,  decl: 4,  agentId: agentIds.amira },
  ];
  for (const a of actions) {
    if (!ids[a.decl] || !a.token) continue;
    const body = a.agentId ? { agent_id: a.agentId } : {};
    const r = await api('post', `/chef/declarations/${ids[a.decl]}/accept`, body, a.token);
    if (r?.declaration) { log('✅', `Chef accepted decl ${a.decl+1}`); ok++; }
  }
  // Chef Espaces refuses decl 10
  if (ids[10] && tokens.chefEspaces) {
    const r = await api('post', `/chef/declarations/${ids[10]}/refuse`,
      { reason: 'Matériel spécialisé requis. En attente du prestataire externe.' },
      tokens.chefEspaces);
    if (r?.declaration) { log('✅', 'Chef refused decl 11 (parc)'); ok++; }
  }
}

// ── STEP 4C: Agents accept & resolve ─────────────────────────
async function agentsWork(tokens, ids) {
  log('\n🔧', 'Agents working...');
  const flow = [
    { token: tokens.aymen, decl: 0,  action: 'accept'  },
    { token: tokens.aymen, decl: 3,  action: 'accept'  },
    { token: tokens.aymen, decl: 3,  action: 'resolve' },
    { token: tokens.imen,  decl: 1,  action: 'accept'  },
    { token: tokens.imen,  decl: 1,  action: 'resolve' },
    { token: tokens.riadh, decl: 2,  action: 'accept'  },
    { token: tokens.riadh, decl: 2,  action: 'resolve' },
  ];
  for (const f of flow) {
    if (!ids[f.decl] || !f.token) continue;
    if (f.action === 'resolve') {
      const p = await apiMultipart(`/agent/declarations/${ids[f.decl]}/photo`, f.token, 'dummy.jpg');
      if (p) { log('✅', `Agent uploaded photo for decl ${f.decl+1}`); ok++; }
    }
    const r = await api('post', `/agent/declarations/${ids[f.decl]}/${f.action}`, {}, f.token);
    if (r?.declaration) { log('✅', `Agent ${f.action} decl ${f.decl+1}`); ok++; }
  }
}

// ── STEP 4D: Ratings ──────────────────────────────────────────
async function citizenRate(tokens, ids) {
  log('\n⭐', 'Citizens rating...');
  const ratings = [
    { token: tokens.sami,  decl: 1, score: 5, comment: 'Intervention rapide, excellent travail !' },
    { token: tokens.sami,  decl: 2, score: 4, comment: 'Bonne intervention, merci.' },
    { token: tokens.ines,  decl: 3, score: 5, comment: 'Parfait, réparé en 24h !' },
  ];
  for (const r of ratings) {
    if (!ids[r.decl] || !r.token) continue;
    const res = await api('post', `/declarations/${ids[r.decl]}/rate`,
      { score: r.score, comment: r.comment }, r.token);
    if (res) { log('✅', `Rated decl ${r.decl+1} → ${r.score}★`); ok++; }
  }
}

// ── STEP 4E: Votes on declarations ───────────────────────────
async function citizenVoteDecl(tokens, ids) {
  log('\n🗳️ ', 'Voting on declarations...');
  const votes = [
    { token: tokens.sami,  decls: [3,4,5,6] },
    { token: tokens.ines,  decls: [0,1,2]   },
    { token: tokens.ahmed, decls: [0,3,8]   },
  ];
  for (const v of votes) {
    for (const i of v.decls) {
      if (!ids[i] || !v.token) continue;
      await api('post', `/declarations/${ids[i]}/vote`, null, v.token);
      log('✅', `Vote on decl ${i+1}`); ok++;
    }
  }
}

// ── STEP 5: Propositions ──────────────────────────────────────
async function createPropositions(tokens) {
  log('\n💡', 'Creating Propositions...');
  const today = new Date().toISOString().split('T')[0];
  const future = d => { const dt = new Date(); dt.setDate(dt.getDate()+d); return dt.toISOString().split('T')[0]; };

  const props = [
    { title:'Végétalisation de la Place des Martyrs', description:'Projet de création d\'un jardin urbain vertical et installation de 20 nouveaux bancs ombragés pour réduire les îlots de chaleur. Budget estimé: 85,000 DT.', start_date:today, end_date:future(30) },
    { title:'Extension des Pistes Cyclables Phase 2', description:'Prolongement de 12km de pistes cyclables sécurisées reliant Sousse Ville à Sousse Jawhara. Réduction du trafic et émissions CO2.', start_date:today, end_date:future(45) },
    { title:'Smart Waste Sensors — Bacs Connectés', description:'Installation de capteurs IoT sur 200 bacs à ordures pour optimiser les tournées de collecte et réduire les émissions de 40%.', start_date:today, end_date:future(60) },
  ];

  const propIds = [];
  for (const p of props) {
    const r = await api('post', '/president/propositions', p, tokens.president);
    if (r?.proposition) { propIds.push(r.proposition.id); log('✅', `Proposition: ${p.title.slice(0,35)}...`); ok++; }
    else propIds.push(null);
  }

  // Vote on propositions
  log('\n🗳️ ', 'Voting on propositions...');
  const propVotes = [
    { token: tokens.sami,  votes: [['pour'],['pour'],['pour']] },
    { token: tokens.ines,  votes: [['pour'],['pour'],['contre']] },
    { token: tokens.ahmed, votes: [['pour'],['pour'],['pour']] },
    { token: tokens.fatma, votes: [['pour'],['contre'],['pour']] },
  ];
  for (const pv of propVotes) {
    for (let i = 0; i < propIds.length; i++) {
      if (!propIds[i] || !pv.token) continue;
      const r = await api('post', `/propositions/${propIds[i]}/vote`, { vote: pv.votes[i][0] }, pv.token);
      if (r) { log('✅', `Vote prop ${i+1}`); ok++; }
    }
  }
}

// ── STEP 6: Summary ───────────────────────────────────────────
function printSummary() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         FIXMACITY — DEMO CREDENTIALS                ║
╠══════════════════════════════════════════════════════╣
║ PRESIDENT                                            ║
║  president@sousse.tn / Password123!                  ║
╠══════════════════════════════════════════════════════╣
║ CHEFS DE SERVICE                                     ║
║  chef.voirie@sousse.tn    / Chef1234!  (Voirie)      ║
║  chef.eclairage@sousse.tn / Chef1234!  (Eclairage)   ║
║  chef.proprete@sousse.tn  / Chef1234!  (Propreté)    ║
║  chef.espaces@sousse.tn   / Chef1234!  (Espaces)     ║
╠══════════════════════════════════════════════════════╣
║ AGENTS TERRAIN                                       ║
║  agent.aymen@sousse.tn / Agent1234!   (Voirie)       ║
║  agent.omar@sousse.tn  / Agent1234!   (Voirie)       ║
║  agent.imen@sousse.tn  / Agent1234!   (Eclairage)    ║
║  agent.riadh@sousse.tn / Agent1234!   (Propreté)     ║
║  agent.amira@sousse.tn / Agent1234!   (Espaces)      ║
╠══════════════════════════════════════════════════════╣
║ CITOYENS                                             ║
║  sami.citizen@gmail.com  / Citoyen123! (Sousse Ville)║
║  ines.citizen@gmail.com  / Citoyen123! (Jawhara)     ║
║  ahmed.citizen@gmail.com / Citoyen123! (SA)          ║
║  fatma.citizen@gmail.com / Citoyen123! (Sousse Ville)║
║  nour.citizen@gmail.com  / Citoyen123! (Jawhara)     ║
╠══════════════════════════════════════════════════════╣
║ DEMO STATS                                           ║
║  15 Déclarations créées                              ║
║  10 Assignées par le président                       ║
║  3  Résolues avec évaluation                         ║
║  3  Propositions actives                             ║
╚══════════════════════════════════════════════════════╝`);
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  FixMaCity Demo Seed — Starting...\n');

  // 1. Login as president
  const presToken = await login('president@sousse.tn', 'Password123!');
  if (!presToken) { console.error('❌  Cannot login as president. Aborting.'); process.exit(1); }
  log('✅', 'President logged in');

  // 2. Fetch dept IDs dynamically
  await fetchDepts(presToken);

  // 3. Create accounts
  await createAccounts(presToken);

  // 4. Login all actors
  const tokens = {
    president:   presToken,
    sami:        await login('sami.citizen@gmail.com',  'Citoyen123!'),
    ines:        await login('ines.citizen@gmail.com',  'Citoyen123!'),
    ahmed:       await login('ahmed.citizen@gmail.com', 'Citoyen123!'),
    fatma:       await login('fatma.citizen@gmail.com', 'Citoyen123!'),
    nour:        await login('nour.citizen@gmail.com',  'Citoyen123!'),
    chefVoirie:  await login('chef.voirie@sousse.tn',   'Chef1234!'),
    chefEcl:     await login('chef.eclairage@sousse.tn','Chef1234!'),
    chefProprete:await login('chef.proprete@sousse.tn', 'Chef1234!'),
    chefEspaces: await login('chef.espaces@sousse.tn',  'Chef1234!'),
    aymen:       await login('agent.aymen@sousse.tn',   'Agent1234!'),
    omar:        await login('agent.omar@sousse.tn',    'Agent1234!'),
    imen:        await login('agent.imen@sousse.tn',    'Agent1234!'),
    riadh:       await login('agent.riadh@sousse.tn',   'Agent1234!'),
    amira:       await login('agent.amira@sousse.tn',   'Agent1234!'),
  };

  // 5. Get agent IDs for chef assignment
  const agentIds = {};
  const agentEmails = { aymen:'agent.aymen@sousse.tn', omar:'agent.omar@sousse.tn', imen:'agent.imen@sousse.tn', riadh:'agent.riadh@sousse.tn', amira:'agent.amira@sousse.tn' };
  for (const [key, email] of Object.entries(agentEmails)) {
    const usersRes = await api('get', `/president/users?role=agent`, null, presToken);
    const found = usersRes?.users?.find(u => u.email === email);
    if (found) agentIds[key] = found.id;
  }
  log('✅', `Agent IDs: ${JSON.stringify(agentIds)}`);

  // 6. Create declarations
  const ids = await createDeclarations(tokens);
  log('✅', `Declarations created. IDs: ${ids.filter(Boolean).length}/15`);

  // 7. Workflow
  await presidentAssigns(presToken, ids, agentIds);
  await chefsAccept(tokens, ids, agentIds);
  await agentsWork(tokens, ids);
  await citizenRate(tokens, ids);
  await citizenVoteDecl(tokens, ids);
  await createPropositions(tokens);

  // 8. Summary
  console.log(`\n✅  Done: ${ok} success, ❌ ${fail} failed\n`);
  printSummary();
}

main().catch(e => { console.error('💥 Fatal:', e.message); process.exit(1); });
