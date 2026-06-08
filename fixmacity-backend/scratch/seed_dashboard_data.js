'use strict';
/**
 * seed_full_data.js
 * Seeds the president dashboard with:
 * 1. Declarations linked to services (for Performance par département)
 * 2. Resolved declarations (for resolution rate)
 * 3. Citizen propositions (with votes)
 * 4. Ratings for resolved declarations
 */
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'fixmacity',
  user: 'postgres',
  password: '98452169.PApa'
});

// IDs from the database
const SERVICES = {
  VR: 'c3c9d2cd-4b55-481b-b577-92ae1ee7d8d1', // Voirie & Routes
  EP: 'af6c8348-0e2b-40fe-b4aa-54629d483559', // Éclairage public
  EV: 'f6c86d36-3e26-442f-9e3f-2b745083109f', // Espaces verts
  PD: '5ab878b9-2d37-455e-b8cf-7fe91dd5e088', // Propreté & Déchets
  EA: '48256387-922e-4af8-854a-f09738f15fdc', // Réseaux & Drainage
  ST: 'bd7043c9-b2c7-4ca1-b3e9-777a3bdc2dbd', // Signalisation routière
  BP: '090910f9-c9f6-4e84-b7ed-46789d4e4eaf', // Administratif
  SG: '3cf62603-5e0e-4978-86dc-ef3b00985b25', // Suggestions
};

const CITIZENS = [
  'ac070458-f8c0-4dcc-a95b-be682d36ec9a', // Ahmed
  '4cb46e79-06d9-42f8-82d6-e6d8566b625f', // Ahmed Kamel
  'a8cc3697-aa7c-418d-adfd-f3e9ea2bded2', // Fatma
  '9a6c2f15-e694-4b43-9484-d9863206b1e3', // Ines
  'e86eef7a-3809-4e0b-b01d-da3e1f7e4a96', // Sami
  '8987a5ef-b748-40b2-a97c-aa2d24171a2e', // Nour
  '26a664a0-0aa8-4df3-88f5-66e0549807ba', // Jean
];

const PRESIDENT_ID = 'c1ee309e-b3b8-4ca0-af2f-43f063770cdd';

const CATEGORIES = [
  'Voirie', 'Éclairage', 'Espaces verts', 'Propreté', 'Signalisation', 'Eau & Drainage', 'Administratif',
];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function monthsAgo(n) { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString(); }

async function updateExistingDeclarationsWithService() {
  console.log('\n📋 Updating existing declarations to link to services...');
  
  // Get all declarations without service_id that are in writable statuses
  const { rows: unlinked } = await client.query(`
    SELECT id, category FROM declarations 
    WHERE service_id IS NULL AND deleted_at IS NULL
      AND status = 'soumise'
    ORDER BY created_at DESC
  `);
  
  console.log(`  Found ${unlinked.length} soumise declarations without service_id`);
  
  // Map categories to services
  const categoryToService = {
    'Voirie': SERVICES.VR,
    'Routes': SERVICES.VR,
    'Chaussée': SERVICES.VR,
    'Éclairage': SERVICES.EP,
    'Eclairage': SERVICES.EP,
    'Lumière': SERVICES.EP,
    'Espaces verts': SERVICES.EV,
    'Parc': SERVICES.EV,
    'Jardin': SERVICES.EV,
    'Propreté': SERVICES.PD,
    'Proprete': SERVICES.PD,
    'Déchets': SERVICES.PD,
    'Dechets': SERVICES.PD,
    'Ordures': SERVICES.PD,
    'Signalisation': SERVICES.ST,
    'Signal': SERVICES.ST,
    'Eau': SERVICES.EA,
    'Drainage': SERVICES.EA,
    'Inondation': SERVICES.EA,
    'Réseau': SERVICES.EA,
    'Administratif': SERVICES.BP,
    'Suggestions': SERVICES.SG,
  };

  let updated = 0;
  for (const decl of unlinked) {
    const cat = decl.category || '';
    let serviceId = null;
    for (const [key, svc] of Object.entries(categoryToService)) {
      if (cat.toLowerCase().includes(key.toLowerCase())) {
        serviceId = svc;
        break;
      }
    }
    // If no match, randomly assign
    if (!serviceId) {
      const keys = Object.values(SERVICES);
      serviceId = keys[Math.floor(Math.random() * keys.length)];
    }

    try {
      await client.query(
        `UPDATE declarations SET service_id = $1, department_id = $1 WHERE id = $2 AND status = 'soumise'`,
        [serviceId, decl.id]
      );
      updated++;
    } catch (e) {
      // skip locked
    }
  }
  console.log(`  ✅ Updated ${updated} declarations with service links`);
}

async function seedResolvedDeclarations() {
  console.log('\n🏗️  Seeding resolved declarations for trend data...');
  
  // Get all delegations
  const { rows: delegations } = await client.query(`SELECT id FROM delegations LIMIT 5`);
  
  const declarations = [
    // VR - Voirie & Routes (high volume)
    { service: SERVICES.VR, category: 'Voirie', status: 'resolue', priority: 'haute', daysAgoCreated: 45, daysAgoResolved: 20, votes: 12 },
    { service: SERVICES.VR, category: 'Voirie', status: 'resolue', priority: 'haute', daysAgoCreated: 40, daysAgoResolved: 15, votes: 8 },
    { service: SERVICES.VR, category: 'Voirie', status: 'cloturee', priority: 'moyenne', daysAgoCreated: 55, daysAgoResolved: 30, votes: 5 },
    { service: SERVICES.VR, category: 'Voirie', status: 'cloturee', priority: 'moyenne', daysAgoCreated: 50, daysAgoResolved: 25, votes: 3 },
    { service: SERVICES.VR, category: 'Voirie', status: 'en_cours', priority: 'haute', daysAgoCreated: 10, votes: 22 },
    { service: SERVICES.VR, category: 'Voirie', status: 'assignee_chef', priority: 'haute', daysAgoCreated: 5, votes: 31 },
    { service: SERVICES.VR, category: 'Voirie', status: 'assignee_chef', priority: 'haute', daysAgoCreated: 8, votes: 19 },
    { service: SERVICES.VR, category: 'Voirie', status: 'soumise', priority: 'basse', daysAgoCreated: 2, votes: 0 },
    
    // EP - Éclairage
    { service: SERVICES.EP, category: 'Éclairage', status: 'resolue', priority: 'haute', daysAgoCreated: 60, daysAgoResolved: 35, votes: 9 },
    { service: SERVICES.EP, category: 'Éclairage', status: 'resolue', priority: 'haute', daysAgoCreated: 35, daysAgoResolved: 10, votes: 7 },
    { service: SERVICES.EP, category: 'Éclairage', status: 'cloturee', priority: 'haute', daysAgoCreated: 70, daysAgoResolved: 50, votes: 14 },
    { service: SERVICES.EP, category: 'Éclairage', status: 'assignee_chef', priority: 'moyenne', daysAgoCreated: 7, votes: 4 },
    { service: SERVICES.EP, category: 'Éclairage', status: 'soumise', priority: 'basse', daysAgoCreated: 3, votes: 1 },
    { service: SERVICES.EP, category: 'Éclairage', status: 'soumise', priority: 'haute', daysAgoCreated: 1, votes: 6 },
    
    // EV - Espaces verts
    { service: SERVICES.EV, category: 'Espaces verts', status: 'resolue', priority: 'moyenne', daysAgoCreated: 90, daysAgoResolved: 65, votes: 3 },
    { service: SERVICES.EV, category: 'Espaces verts', status: 'cloturee', priority: 'basse', daysAgoCreated: 80, daysAgoResolved: 60, votes: 2 },
    { service: SERVICES.EV, category: 'Espaces verts', status: 'soumise', priority: 'basse', daysAgoCreated: 4, votes: 0 },
    { service: SERVICES.EV, category: 'Espaces verts', status: 'assignee_chef', priority: 'moyenne', daysAgoCreated: 9, votes: 2 },
    
    // PD - Propreté
    { service: SERVICES.PD, category: 'Propreté', status: 'resolue', priority: 'haute', daysAgoCreated: 30, daysAgoResolved: 5, votes: 18 },
    { service: SERVICES.PD, category: 'Propreté', status: 'cloturee', priority: 'haute', daysAgoCreated: 45, daysAgoResolved: 20, votes: 11 },
    { service: SERVICES.PD, category: 'Propreté', status: 'en_cours', priority: 'haute', daysAgoCreated: 6, votes: 25 },
    { service: SERVICES.PD, category: 'Propreté', status: 'assignee_chef', priority: 'haute', daysAgoCreated: 3, votes: 16 },
    { service: SERVICES.PD, category: 'Propreté', status: 'soumise', priority: 'moyenne', daysAgoCreated: 1, votes: 7 },
    
    // EA - Réseaux & Drainage
    { service: SERVICES.EA, category: 'Eau & Drainage', status: 'resolue', priority: 'haute', daysAgoCreated: 25, daysAgoResolved: 3, votes: 28 },
    { service: SERVICES.EA, category: 'Eau & Drainage', status: 'assignee_chef', priority: 'haute', daysAgoCreated: 2, votes: 35 },
    { service: SERVICES.EA, category: 'Eau & Drainage', status: 'soumise', priority: 'haute', daysAgoCreated: 1, votes: 42 },
    
    // ST - Signalisation
    { service: SERVICES.ST, category: 'Signalisation', status: 'resolue', priority: 'moyenne', daysAgoCreated: 50, daysAgoResolved: 30, votes: 4 },
    { service: SERVICES.ST, category: 'Signalisation', status: 'cloturee', priority: 'moyenne', daysAgoCreated: 60, daysAgoResolved: 40, votes: 3 },
    { service: SERVICES.ST, category: 'Signalisation', status: 'soumise', priority: 'basse', daysAgoCreated: 5, votes: 1 },
    
    // BP - Administratif
    { service: SERVICES.BP, category: 'Administratif', status: 'assignee_chef', priority: 'basse', daysAgoCreated: 12, votes: 0 },
    { service: SERVICES.BP, category: 'Administratif', status: 'soumise', priority: 'basse', daysAgoCreated: 4, votes: 0 },
  ];

  let count = 0;
  const delegationIds = delegations.map(d => d.id);
  
  for (const decl of declarations) {
    const citizen = randomItem(CITIZENS);
    const delegId = delegationIds.length > 0 ? randomItem(delegationIds) : null;
    const createdAt = daysAgo(decl.daysAgoCreated);
    const resolvedAt = decl.daysAgoResolved ? daysAgo(decl.daysAgoResolved) : null;
    const title = `${decl.category} — Signalement prioritaire`;
    const priorityScore = decl.priority === 'haute' ? randomInt(12, 25) : decl.priority === 'moyenne' ? randomInt(6, 12) : randomInt(1, 6);
    
    const { rows } = await client.query(`
      INSERT INTO declarations (
        title, description, category, status, service_id, department_id,
        citizen_id, delegation_id, votes_count, priority, priority_score,
        created_at, resolved_at, deleted_at, is_deleted,
        ref_citoyen
      ) VALUES (
        $1, $2, $3, $4::declaration_status, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, NULL, FALSE,
        CONCAT('REF-', LPAD(CAST(FLOOR(RANDOM() * 99999) AS TEXT), 5, '0'))
      )
      RETURNING id
    `, [
      title,
      `Problème signalé dans la zone ${delegId ? 'connue' : 'inconnue'}. Intervention nécessaire.`,
      decl.category,
      decl.status,
      decl.service, decl.service,
      citizen, delegId,
      decl.votes || 0,
      decl.priority,
      priorityScore,
      createdAt, resolvedAt
    ]);
    
    count++;
    
    // Add rating for resolved declarations
    if ((decl.status === 'resolue' || decl.status === 'cloturee') && rows[0]) {
      const score = randomInt(3, 5);
      await client.query(`
        INSERT INTO ratings (declaration_id, citizen_id, score, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [rows[0].id, citizen, score, resolvedAt || createdAt]);
    }
  }
  
  console.log(`  ✅ Inserted ${count} declarations`);
}

async function seedCitizenPropositions() {
  console.log('\n💡 Seeding citizen propositions...');
  
  const citizenPropositions = [
    {
      title: 'Création d\'une piste cyclable sur l\'Avenue Habib Bourguiba',
      description: 'La circulation des vélos est dangereuse sur cette avenue très fréquentée. Une piste cyclable sécurisée permettrait de réduire les embouteillages et favoriser les transports doux.',
      category: 'Voirie',
      votes_pour: 47,
      votes_contre: 8,
      citizen: CITIZENS[0],
      created_at: daysAgo(15),
    },
    {
      title: 'Installation de bornes de recharge électrique dans les parkings publics',
      description: 'Avec l\'essor des véhicules électriques, nos parkings doivent être équipés pour accueillir cette nouvelle réalité. Proposition d\'installer au moins 10 bornes de recharge.',
      category: 'Éclairage',
      votes_pour: 38,
      votes_contre: 5,
      citizen: CITIZENS[1],
      created_at: daysAgo(22),
    },
    {
      title: 'Aménagement d\'une zone piétonne dans le centre historique',
      description: 'Le centre ville souffre de saturation automobile. Une zone piétonne attirerait plus de commerces et améliorerait la qualité de vie des résidents.',
      category: 'Voirie',
      votes_pour: 61,
      votes_contre: 12,
      citizen: CITIZENS[2],
      created_at: daysAgo(30),
    },
    {
      title: 'Programme de compostage communautaire dans les quartiers résidentiels',
      description: 'Mettre en place des bacs de compostage collectifs dans les résidences pour réduire les déchets organiques et produire du compost pour les espaces verts.',
      category: 'Propreté',
      votes_pour: 29,
      votes_contre: 4,
      citizen: CITIZENS[3],
      created_at: daysAgo(8),
    },
    {
      title: 'Réhabilitation du parc municipal et ajout d\'équipements sportifs',
      description: 'Le parc central est en mauvais état. Proposition de le réhabiliter et d\'y ajouter des équipements sportifs en plein air accessibles à tous (piste de jogging, fitness, aires de jeux).',
      category: 'Espaces Verts',
      votes_pour: 53,
      votes_contre: 7,
      citizen: CITIZENS[4],
      created_at: daysAgo(45),
    },
    {
      title: 'Digitalisation des démarches administratives municipales',
      description: 'Trop de démarches administratives nécessitent encore un déplacement physique. Un portail numérique permettrait de les effectuer en ligne, gagnant du temps pour tous.',
      category: 'Administratif',
      votes_pour: 44,
      votes_contre: 3,
      citizen: CITIZENS[5],
      created_at: daysAgo(12),
    },
    {
      title: 'Mise en place de caméras de surveillance dans les rues sombres',
      description: 'Plusieurs quartiers sont insuffisamment éclairés et peu sécurisés la nuit. L\'installation de caméras de surveillance dissuaderait les actes malveillants.',
      category: 'Sécurité',
      votes_pour: 35,
      votes_contre: 15,
      citizen: CITIZENS[6],
      created_at: daysAgo(18),
    },
    {
      title: 'Création d\'un marché bio hebdomadaire',
      description: 'Un marché de producteurs locaux bios chaque semaine permettrait de promouvoir les circuits courts, soutenir les agriculteurs locaux et offrir des produits frais aux habitants.',
      category: 'Économie Locale',
      votes_pour: 42,
      votes_contre: 6,
      citizen: CITIZENS[0],
      created_at: daysAgo(25),
    },
    {
      title: 'Éclairage solaire pour les rues secondaires',
      description: 'Installer des lampadaires solaires dans les rues secondaires permettrait de réduire la facture énergétique de la municipalité tout en améliorant la sécurité des zones peu éclairées.',
      category: 'Éclairage',
      votes_pour: 56,
      votes_contre: 4,
      citizen: CITIZENS[1],
      created_at: daysAgo(35),
    },
    {
      title: 'Application mobile de signalement des nids-de-poule',
      description: 'Une application permettant aux citoyens de prendre en photo et géolocaliser les dégradations de la voirie faciliterait leur traitement rapide par les services municipaux.',
      category: 'Voirie',
      votes_pour: 71,
      votes_contre: 2,
      citizen: CITIZENS[2],
      created_at: daysAgo(60),
    },
    {
      title: 'Plantations d\'arbres le long des grands axes routiers',
      description: 'Les grandes artères de la ville manquent d\'ombre. Planter des arbres permettrait de lutter contre les îlots de chaleur urbains et améliorer le cadre de vie.',
      category: 'Espaces Verts',
      votes_pour: 39,
      votes_contre: 9,
      citizen: CITIZENS[3],
      created_at: daysAgo(40),
    },
    {
      title: 'Révision du plan de collecte des ordures ménagères',
      description: 'La collecte des ordures est irrégulière dans certains quartiers. Une révision du plan de collecte avec des horaires fixes permettrait d\'améliorer la propreté globale de la ville.',
      category: 'Propreté',
      votes_pour: 33,
      votes_contre: 5,
      citizen: CITIZENS[4],
      created_at: daysAgo(20),
    },
  ];

  let count = 0;
  for (const prop of citizenPropositions) {
    await client.query(`
      INSERT INTO propositions (
        title, description, category, status,
        votes_pour, votes_contre,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'active',
        $4, $5,
        $6, $7, NOW()
      )
    `, [
      prop.title, prop.description, prop.category,
      prop.votes_pour, prop.votes_contre,
      prop.citizen, prop.created_at
    ]);
    count++;
  }
  console.log(`  ✅ Inserted ${count} citizen propositions`);
}

async function seedHistoricalTrend() {
  console.log('\n📈 Seeding historical trend data (past 6 months)...');
  
  // Get delegations for variety
  const { rows: delegations } = await client.query(`SELECT id FROM delegations LIMIT 5`);
  const delegationIds = delegations.map(d => d.id);
  
  const services = Object.values(SERVICES);
  const statuses = ['resolue', 'cloturee', 'assignee_chef', 'soumise'];
  const priorities = ['haute', 'moyenne', 'basse'];
  const categories = ['Voirie', 'Éclairage', 'Espaces verts', 'Propreté', 'Signalisation', 'Eau & Drainage'];
  
  let count = 0;
  // Generate ~5 declarations per month for past 6 months
  for (let monthsBack = 5; monthsBack >= 1; monthsBack--) {
    const nDecls = randomInt(4, 8);
    for (let i = 0; i < nDecls; i++) {
      const daysInMonth = randomInt(monthsBack * 30, (monthsBack + 1) * 30 - 1);
      const createdAt = daysAgo(daysInMonth);
      const status = monthsBack > 2 ? randomItem(['resolue', 'cloturee', 'resolue']) : randomItem(statuses);
      const resolvedAt = (status === 'resolue' || status === 'cloturee') 
        ? daysAgo(Math.max(0, daysInMonth - randomInt(7, 20))) 
        : null;
      const service = randomItem(services);
      const category = randomItem(categories);
      const citizen = randomItem(CITIZENS);
      const delegId = delegationIds.length > 0 ? randomItem(delegationIds) : null;
      
      await client.query(`
        INSERT INTO declarations (
          title, description, category, status, service_id, department_id,
          citizen_id, delegation_id, votes_count, priority, priority_score,
          created_at, resolved_at, deleted_at, is_deleted,
          ref_citoyen
        ) VALUES (
          $1, $2, $3, $4::declaration_status, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, NULL, FALSE,
          CONCAT('REF-H', LPAD(CAST(FLOOR(RANDOM() * 99999) AS TEXT), 5, '0'))
        )
      `, [
        `${category} — Historique`,
        `Déclaration historique générée pour les statistiques.`,
        category,
        status,
        service, service,
        citizen, delegId,
        randomInt(0, 15),
        randomItem(priorities),
        randomInt(5, 20),
        createdAt, resolvedAt
      ]);
      count++;
    }
  }
  console.log(`  ✅ Inserted ${count} historical declarations`);
}

async function main() {
  await client.connect();
  console.log('✅ Connected to fixmacity DB\n');
  
  try {
    await updateExistingDeclarationsWithService();
    await seedResolvedDeclarations();
    await seedHistoricalTrend();
    await seedCitizenPropositions();
    
    // Final counts
    console.log('\n📊 Final Stats:');
    const { rows: deptStats } = await client.query(`
      SELECT s.name_fr, COUNT(d.id) as total, 
             COUNT(d.id) FILTER (WHERE d.status IN ('resolue','cloturee')) as resolved
      FROM services s
      LEFT JOIN declarations d ON d.service_id = s.id AND d.deleted_at IS NULL
      GROUP BY s.name_fr ORDER BY total DESC
    `);
    console.table(deptStats);
    
    const { rows: propCount } = await client.query(`SELECT COUNT(*) as total FROM propositions`);
    console.log(`Propositions total: ${propCount[0].total}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await client.end();
    console.log('\nDone ✅');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
