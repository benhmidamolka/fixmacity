const fs = require('fs');
const path = require('path');

const arFile = path.resolve('src/i18n/locales/ar.ts');
const enFile = path.resolve('src/i18n/locales/en.ts');
const frFile = path.resolve('src/i18n/locales/fr.ts');
const trFile = path.resolve('src/pages/Citizen/TravauxRealises.tsx');
const prFile = path.resolve('src/pages/Citizen/Propositions.tsx');

let trContent = fs.readFileSync(trFile, 'utf8');

trContent = trContent.replace(
  /const MOCK_FIXES = \[([\s\S]*?)\]\n\nconst MOCK_PROJECTS/m,
  "const getMockFixes = (t: any) => [\n" +
  "  { id: '1', title: t('works.mocks.fixes.1.title', 'Réparation chaussée Rue Ibn Khaldoun'), category: t('works.mocks.fixes.1.category', 'Voirie'), description: t('works.mocks.fixes.1.desc', \"Le nid de poule signalé par plusieurs citoyens a été réparé par l'équipe voirie en 2 jours.\"), address: t('works.mocks.fixes.1.addr', 'Rue Ibn Khaldoun, Sousse'), resolved_at: new Date(Date.now() - 2 * 86400000).toISOString(), rating: 5, rating_comment: t('works.mocks.fixes.1.comment', 'Travail rapide et propre, merci !'), votes_count: 14, before_img: 'https://chatgpt.com/backend-api/estuary/content?id=file_000000001be8720abba7aae3312f9e28&fn=image.png&cd=attachment&ts=494569&p=fs&cid=1&sig=8b58ed0a663b17c01b7f504aa45258d3ad05b89150135bc8a1bef7d24ee4e5dd&v=0', after_img: '' },\n" +
  "  { id: '2', title: t('works.mocks.fixes.2.title', 'Éclairage public Place Farhat Hached'), category: t('works.mocks.fixes.2.category', 'Éclairage'), description: t('works.mocks.fixes.2.desc', '3 lampadaires défectueux remplacés par des modèles LED haute efficacité.'), address: t('works.mocks.fixes.2.addr', 'Place Farhat Hached, Sousse'), resolved_at: new Date(Date.now() - 4 * 86400000).toISOString(), rating: 4, rating_comment: t('works.mocks.fixes.2.comment', 'Intervention rapide, merci!'), votes_count: 8, after_img: 'http://www.commune-sousse.gov.tn/sites/default/files/16777126_10206506030849776_1318912901_o_1.jpg' },\n" +
  "  { id: '3', title: t('works.mocks.fixes.3.title', 'Nettoyage Parc de la Ligue Arabe'), category: t('works.mocks.fixes.3.category', 'Propreté'), description: t('works.mocks.fixes.3.desc', 'Le parc a été entièrement nettoyé et de nouveaux bacs à ordures installés.'), address: t('works.mocks.fixes.3.addr', 'Parc de la Ligue Arabe, Sousse'), resolved_at: new Date(Date.now() - 7 * 86400000).toISOString(), rating: 5, rating_comment: t('works.mocks.fixes.3.comment', 'Super initiative !'), votes_count: 22, after_img: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&q=80' },\n" +
  "  { id: '4', title: t('works.mocks.fixes.4.title', 'Taille des arbres Avenue Bourguiba'), category: t('works.mocks.fixes.4.category', 'Espaces Verts'), description: t('works.mocks.fixes.4.desc', \"Les arbres obstruant la visibilité ont été taillés par l'équipe espaces verts.\"), address: t('works.mocks.fixes.4.addr', 'Av. Habib Bourguiba, Sousse'), resolved_at: new Date(Date.now() - 10 * 86400000).toISOString(), rating: 4, rating_comment: undefined, votes_count: 6, after_img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80' },\n" +
  "  { id: '5', title: t('works.mocks.fixes.5.title', 'Réparation fuite eau Cité Ettaamir'), category: t('works.mocks.fixes.5.category', 'Réseaux'), description: t('works.mocks.fixes.5.desc', \"La fuite d'eau signalée a été colmatée et la chaussée remise en état.\"), address: t('works.mocks.fixes.5.addr', 'Cité Ettaamir, Sousse'), resolved_at: new Date(Date.now() - 14 * 86400000).toISOString(), rating: 3, rating_comment: t('works.mocks.fixes.5.comment', 'Bien mais un peu lent.'), votes_count: 11, after_img: 'https://i5.walmartimages.com/asr/170e4bef-5ecd-4f49-8bc7-4d89e25a2455.8d6351a87cefbf7c2300bed6d4a0d373.jpeg?odnHeight=640&odnWidth=640&odnBg=FFFFFF' },\n" +
  "  { id: '6', title: t('works.mocks.fixes.6.title', 'Panneau stop remplacé Rond-point Nord'), category: t('works.mocks.fixes.6.category', 'Signalisation'), description: t('works.mocks.fixes.6.desc', 'Le panneau stop endommagé a été remplacé par un neuf conforme aux normes.'), address: t('works.mocks.fixes.6.addr', 'Rond-point Sousse Nord'), resolved_at: new Date(Date.now() - 5 * 86400000).toISOString(), rating: 5, rating_comment: undefined, votes_count: 3, after_img: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=80' },\n" +
  "]\n\nconst MOCK_PROJECTS"
);

trContent = trContent.replace(
  /const MOCK_PROJECTS = \[([\s\S]*?)\]\n\nfunction daysAgo/m,
  "const getMockProjects = (t: any) => [\n" +
  "  { id: 'p1', title: t('works.mocks.projects.1.title', 'Végétalisation de la Place des Martyrs'), category: t('works.mocks.projects.1.category', 'Espaces Verts'), description: t('works.mocks.projects.1.desc', \"Transformation de la place centrale en espace vert piétonnier avec 50 arbres et points d'eau écologiques. Projet approuvé par 73% des citoyens.\"), pour_pct: 73, total_votes: 1245, completed_at: new Date(Date.now() - 30 * 86400000).toISOString(), duration: t('works.mocks.projects.1.duration', '3 mois'), img: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&q=80', type: 'voted' },\n" +
  "  { id: 'p2', title: t('works.mocks.projects.2.title', \"Modernisation de l'Éclairage Public\"), category: t('works.mocks.projects.2.category', 'Éclairage'), description: t('works.mocks.projects.2.desc', 'Remplacement de 3000 lampadaires par des LED à détection de mouvement. Réduction de 60% de la consommation énergétique.'), pour_pct: 89, total_votes: 2100, completed_at: new Date(Date.now() - 15 * 86400000).toISOString(), duration: t('works.mocks.projects.2.duration', '4 mois'), img: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&q=80', type: 'voted' },\n" +
  "  { id: 'p3', title: t('works.mocks.projects.3.title', 'Bacs à Ordures Connectés'), category: t('works.mocks.projects.3.category', 'Propreté'), description: t('works.mocks.projects.3.desc', 'Installation de 200 bacs intelligents avec capteurs IoT pour optimiser les tournées de collecte.'), pour_pct: 65, total_votes: 756, completed_at: new Date(Date.now() - 45 * 86400000).toISOString(), duration: t('works.mocks.projects.3.duration', '2 mois'), img: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&q=80', type: 'voted' },\n" +
  "  { id: 'p4', title: t('works.mocks.projects.4.title', 'Réfection du marché municipal'), category: t('works.mocks.projects.4.category', 'Infrastructures'), description: t('works.mocks.projects.4.desc', 'Rénovation complète des toitures et mise aux normes sanitaires du marché central de Sousse. Projet initié et financé par la municipalité.'), completed_at: new Date(Date.now() - 60 * 86400000).toISOString(), duration: t('works.mocks.projects.4.duration', '6 mois'), img: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=600&q=80', type: 'municipal' },\n" +
  "  { id: 'p5', title: t('works.mocks.projects.5.title', \"Nouvelle station d'épuration Sousse Sud\"), category: t('works.mocks.projects.5.category', 'Réseaux'), description: t('works.mocks.projects.5.desc', \"Création d'une station d'épuration de dernière génération pour soulager le réseau sud. Projet mené par la commune.\"), completed_at: new Date(Date.now() - 120 * 86400000).toISOString(), duration: t('works.mocks.projects.5.duration', '12 mois'), img: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=600&q=80', type: 'municipal' },\n" +
  "]\n\nfunction daysAgo"
);

trContent = trContent.replace(/useState<any\[\]>\(MOCK_FIXES\)/g, `useState<any[]>([])`);
trContent = trContent.replace(/useState<any\[\]>\(MOCK_PROJECTS\)/g, `useState<any[]>([])`);
trContent = trContent.replace(
  /const \[projects, setProjects\] = useState<any\[\]>\(\[\]\)/g, 
  `const [projects, setProjects] = useState<any[]>([])\n\n  useEffect(() => {\n    setFixes(getMockFixes(t))\n    setProjects(getMockProjects(t))\n  }, [t])`
);

fs.writeFileSync(trFile, trContent);


let prContent = fs.readFileSync(prFile, 'utf8');

prContent = prContent.replace(
  /const MOCK_PROPS = \[([\s\S]*?)\]\n\nconst CATEGORY_COLORS/m,
  "const getMockProps = (t: any) => [\n" +
  "  {\n" +
  "    id: '1', category: t('propositions.mocks.1.category', 'Espaces Verts'), title: t('propositions.mocks.1.title', 'Végétalisation de la Place des Martyrs'),\n" +
  "    description: t('propositions.mocks.1.desc', \"Ce projet vise à transformer la Place des Martyrs en un véritable poumon vert au cœur de Sousse. Il comprend la plantation d'arbres endémiques, l'installation de bancs ombragés, et la création d'un système d'irrigation écologique. L'objectif est de réduire les îlots de chaleur et d'offrir un espace de détente convivial pour les citoyens.\"),\n" +
  "    pour_pct: 73, total_votes: 1245, duration: t('propositions.mocks.1.duration', '3 mois'),\n" +
  "    img: 'http://www.commune-sousse.gov.tn/sites/default/files/16777126_10206506030849776_1318912901_o_1.jpg',\n" +
  "    end_date: new Date(nowMs + 18 * dayMs).toISOString()\n" +
  "  },\n" +
  "  {\n" +
  "    id: '2', category: t('propositions.mocks.2.category', 'Voirie'), title: t('propositions.mocks.2.title', 'Extension des Pistes Cyclables'),\n" +
  "    description: t('propositions.mocks.2.desc', 'Création de 12 km de nouvelles pistes cyclables sécurisées reliant les principaux quartiers de Sousse au centre-ville, avec des stations de vélos en libre-service.'),\n" +
  "    pour_pct: 81, total_votes: 987, duration: t('propositions.mocks.2.duration', '6 mois'),\n" +
  "    img: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/3a/1b/ac/ballade-a-hergla-au-lever.jpg?w=1400&h=-1&s=1',\n" +
  "    end_date: new Date(nowMs + 5 * dayMs).toISOString()\n" +
  "  },\n" +
  "  {\n" +
  "    id: '3', category: t('propositions.mocks.3.category', 'Propreté'), title: t('propositions.mocks.3.title', 'Bacs à Ordures Connectés'),\n" +
  "    description: t('propositions.mocks.3.desc', 'Installation de 200 bacs à ordures intelligents équipés de capteurs IoT pour optimiser les tournées de collecte et réduire les débordements dans les rues.'),\n" +
  "    pour_pct: 65, total_votes: 756, duration: t('propositions.mocks.3.duration', '2 mois'),\n" +
  "    img: 'https://waste.solutions/wp-content/uploads/2022/08/Ultrasonic-Sensor-1.png',\n" +
  "    end_date: new Date(nowMs + 30 * dayMs).toISOString()\n" +
  "  },\n" +
  "  {\n" +
  "    id: '4', category: t('propositions.mocks.4.category', 'Éclairage public'), title: t('propositions.mocks.4.title', \"Modernisation de l'Éclairage Public\"),\n" +
  "    description: t('propositions.mocks.4.desc', 'Remplacement de 3000 lampadaires par des modèles LED à détection de mouvement, réduisant la consommation énergétique de 60% et améliorant la sécurité nocturne.'),\n" +
  "    pour_pct: 89, total_votes: 2100, duration: t('propositions.mocks.4.duration', '4 mois'),\n" +
  "    img: 'https://realites.com.tn/fr/wp-content/uploads/2026/03/652347036_1233089508896101_5618975784440567528_n.jpg',\n" +
  "    end_date: new Date(nowMs + 2 * dayMs).toISOString()\n" +
  "  },\n" +
  "]\n\nconst CATEGORY_COLORS"
);

prContent = prContent.replace(/enrichPropositions\(MOCK_PROPS\)/g, `enrichPropositions(getMockProps(t))`);
prContent = prContent.replace(/MOCK_PROPS\[Math\.floor\(Math\.random\(\) \* MOCK_PROPS\.length\)\]\.img/g, `"http://www.commune-sousse.gov.tn/sites/default/files/16777126_10206506030849776_1318912901_o_1.jpg"`);
prContent = prContent.replace(/const enrichPropositions = \(arr: any\[\]\) => {/g, `const enrichPropositions = (arr: any[]) => {`);

fs.writeFileSync(prFile, prContent);

// Add AR dictionary
let arContent = fs.readFileSync(arFile, 'utf8');

const arAdditions = "\n" +
"    mocks: {\n" +
"      fixes: {\n" +
"        1: { title: 'إصلاح طريق شارع ابن خلدون', category: 'طرقات', desc: 'تم إصلاح الحفرة التي أبلغ عنها عدة مواطنين من قبل فريق الطرقات في يومين.', addr: 'شارع ابن خلدون، سوسة', comment: 'عمل سريع ونظيف، شكرًا!' },\n" +
"        2: { title: 'إنارة عامة في ساحة فرحات حشاد', category: 'إنارة', desc: 'تم استبدال 3 أعمدة إنارة معطلة بنماذج LED عالية الكفاءة.', addr: 'ساحة فرحات حشاد، سوسة', comment: 'تدخل سريع، شكرًا!' },\n" +
"        3: { title: 'تنظيف حديقة الجامعة العربية', category: 'نظافة', desc: 'تم تنظيف الحديقة بالكامل وتركيب حاويات قمامة جديدة.', addr: 'حديقة الجامعة العربية، سوسة', comment: 'مبادرة رائعة!' },\n" +
"        4: { title: 'تقليم الأشجار في شارع الحبيب بورقيبة', category: 'مساحات خضراء', desc: 'تم تقليم الأشجار التي تعيق الرؤية من قبل فريق المساحات الخضراء.', addr: 'شارع الحبيب بورقيبة، سوسة' },\n" +
"        5: { title: 'إصلاح تسرب المياه في حي التعمير', category: 'شبكات', desc: 'تم سد تسرب المياه المُبلغ عنه وإعادة حالة الطريق.', addr: 'حي التعمير، سوسة', comment: 'جيد ولكن بطيء نوعًا ما.' },\n" +
"        6: { title: 'استبدال علامة قف في مفترق طرق الشمال', category: 'إشارات', desc: 'تم استبدال علامة قف المتضررة بأخرى جديدة مطابقة للمعايير.', addr: 'مفترق طرق سوسة الشمالية' }\n" +
"      },\n" +
"      projects: {\n" +
"        1: { title: 'تشجير ساحة الشهداء', category: 'مساحات خضراء', desc: 'تحويل الساحة المركزية إلى مساحة خضراء للمشاة مع 50 شجرة ونقاط مياه بيئية. تمت الموافقة على المشروع من قبل 73٪ من المواطنين.', duration: '3 أشهر' },\n" +
"        2: { title: 'تحديث الإنارة العامة', category: 'إنارة', desc: 'استبدال 3000 عمود إنارة بـ LED مزودة بكاشف حركة. تقليل استهلاك الطاقة بنسبة 60٪.', duration: '4 أشهر' },\n" +
"        3: { title: 'حاويات قمامة ذكية', category: 'نظافة', desc: 'تركيب 200 حاوية ذكية مزودة بمستشعرات إنترنت الأشياء لتحسين جولات الجمع.', duration: 'شهرين' },\n" +
"        4: { title: 'إعادة تأهيل السوق البلدي', category: 'بنية تحتية', desc: 'تجديد كامل للأسقف والتوافق مع المعايير الصحية للسوق المركزي في سوسة. مشروع بمبادرة وتمويل من البلدية.', duration: '6 أشهر' },\n" +
"        5: { title: 'محطة تنقية جديدة سوسة الجنوبية', category: 'شبكات', desc: 'إنشاء محطة تنقية من الجيل الجديد لتخفيف العبء عن الشبكة الجنوبية. مشروع تديره البلدية.', duration: '12 شهرًا' }\n" +
"      }\n" +
"    },\n";

const arPropAdditions = "\n" +
"    mocks: {\n" +
"      1: { category: 'مساحات خضراء', title: 'تشجير ساحة الشهداء', desc: 'يهدف هذا المشروع إلى تحويل ساحة الشهداء إلى رئة خضراء حقيقية في قلب سوسة. يشمل زراعة أشجار محلية، وتركيب مقاعد مظللة، وإنشاء نظام ري بيئي. الهدف هو تقليل الجزر الحرارية وتوفير مساحة استرخاء ودية للمواطنين.', duration: '3 أشهر' },\n" +
"      2: { category: 'طرقات', title: 'توسيع مسارات الدراجات', desc: 'إنشاء 12 كم من مسارات الدراجات الآمنة الجديدة التي تربط الأحياء الرئيسية في سوسة بوسط المدينة، مع محطات دراجات ذاتية الخدمة.', duration: '6 أشهر' },\n" +
"      3: { category: 'نظافة', title: 'حاويات قمامة ذكية', desc: 'تركيب 200 حاوية قمامة ذكية مزودة بمستشعرات إنترنت الأشياء لتحسين جولات الجمع وتقليل الفيضانات في الشوارع.', duration: 'شهرين' },\n" +
"      4: { category: 'إنارة عامة', title: 'تحديث الإنارة العامة', desc: 'استبدال 3000 عمود إنارة بنماذج LED مزودة بكاشف حركة، مما يقلل من استهلاك الطاقة بنسبة 60٪ ويحسن السلامة الليلية.', duration: '4 أشهر' }\n" +
"    },\n";

if (!arContent.includes('mocks: {')) {
  arContent = arContent.replace(/(\s*)works:\s*\{/, '$1works: {' + arAdditions);
  arContent = arContent.replace(/(\s*)propositions:\s*\{/, '$1propositions: {' + arPropAdditions);
  fs.writeFileSync(arFile, arContent);
}

let enContent = fs.readFileSync(enFile, 'utf8');

const enAdditions = "\n" +
"    mocks: {\n" +
"      fixes: {\n" +
"        1: { title: 'Road Repair Ibn Khaldoun Street', category: 'Roads', desc: 'The pothole reported by several citizens was repaired by the roads team in 2 days.', addr: 'Ibn Khaldoun Street, Sousse', comment: 'Fast and clean work, thanks!' },\n" +
"        2: { title: 'Public Lighting Farhat Hached Square', category: 'Lighting', desc: '3 defective streetlights replaced by high-efficiency LED models.', addr: 'Farhat Hached Square, Sousse', comment: 'Fast intervention, thanks!' },\n" +
"        3: { title: 'Cleaning Arab League Park', category: 'Cleanliness', desc: 'The park was completely cleaned and new trash bins installed.', addr: 'Arab League Park, Sousse', comment: 'Great initiative!' },\n" +
"        4: { title: 'Tree Trimming Bourguiba Avenue', category: 'Green Spaces', desc: 'Trees obstructing visibility were trimmed by the green spaces team.', addr: 'Bourguiba Ave, Sousse' },\n" +
"        5: { title: 'Water Leak Repair Ettaamir District', category: 'Networks', desc: 'The reported water leak was sealed and the road restored.', addr: 'Ettaamir District, Sousse', comment: 'Good but a bit slow.' },\n" +
"        6: { title: 'Stop Sign Replaced North Roundabout', category: 'Signage', desc: 'The damaged stop sign was replaced by a new standard-compliant one.', addr: 'Sousse North Roundabout' }\n" +
"      },\n" +
"      projects: {\n" +
"        1: { title: 'Greening of Martyrs Square', category: 'Green Spaces', desc: 'Transformation of the central square into a pedestrian green space with 50 trees and ecological water points. Project approved by 73% of citizens.', duration: '3 months' },\n" +
"        2: { title: 'Modernization of Public Lighting', category: 'Lighting', desc: 'Replacement of 3000 streetlights with motion-sensing LEDs. 60% reduction in energy consumption.', duration: '4 months' },\n" +
"        3: { title: 'Connected Trash Bins', category: 'Cleanliness', desc: 'Installation of 200 smart bins with IoT sensors to optimize collection routes.', duration: '2 months' },\n" +
"        4: { title: 'Municipal Market Renovation', category: 'Infrastructure', desc: 'Complete renovation of roofs and sanitary compliance of Sousse central market. Project initiated and financed by the municipality.', duration: '6 months' },\n" +
"        5: { title: 'New Sousse South Treatment Plant', category: 'Networks', desc: 'Creation of a next-generation treatment plant to relieve the southern network. Project led by the municipality.', duration: '12 months' }\n" +
"      }\n" +
"    },\n";

const enPropAdditions = "\n" +
"    mocks: {\n" +
"      1: { category: 'Green Spaces', title: 'Greening of Martyrs Square', desc: 'This project aims to transform Martyrs Square into a real green lung in the heart of Sousse. It includes planting endemic trees, installing shaded benches, and creating an ecological irrigation system. The goal is to reduce heat islands and provide a friendly relaxation space for citizens.', duration: '3 months' },\n" +
"      2: { category: 'Roads', title: 'Extension of Bike Paths', desc: 'Creation of 12 km of new secure bike paths connecting the main districts of Sousse to the city center, with self-service bike stations.', duration: '6 months' },\n" +
"      3: { category: 'Cleanliness', title: 'Connected Trash Bins', desc: 'Installation of 200 smart trash bins equipped with IoT sensors to optimize collection routes and reduce street overflows.', duration: '2 months' },\n" +
"      4: { category: 'Public Lighting', title: 'Modernization of Public Lighting', desc: 'Replacement of 3000 streetlights with motion-sensing LED models, reducing energy consumption by 60% and improving night safety.', duration: '4 months' }\n" +
"    },\n";

if (!enContent.includes('mocks: {')) {
  enContent = enContent.replace(/(\s*)works:\s*\{/, '$1works: {' + enAdditions);
  enContent = enContent.replace(/(\s*)propositions:\s*\{/, '$1propositions: {' + enPropAdditions);
  fs.writeFileSync(enFile, enContent);
}

let frContent = fs.readFileSync(frFile, 'utf8');

const frAdditions = "\n" +
"    mocks: {\n" +
"      fixes: {\n" +
"        1: { title: 'Réparation chaussée Rue Ibn Khaldoun', category: 'Voirie', desc: \"Le nid de poule signalé par plusieurs citoyens a été réparé par l'équipe voirie en 2 jours.\", addr: 'Rue Ibn Khaldoun, Sousse', comment: 'Travail rapide et propre, merci !' },\n" +
"        2: { title: 'Éclairage public Place Farhat Hached', category: 'Éclairage', desc: '3 lampadaires défectueux remplacés par des modèles LED haute efficacité.', addr: 'Place Farhat Hached, Sousse', comment: 'Intervention rapide, merci!' },\n" +
"        3: { title: 'Nettoyage Parc de la Ligue Arabe', category: 'Propreté', desc: 'Le parc a été entièrement nettoyé et de nouveaux bacs à ordures installés.', addr: 'Parc de la Ligue Arabe, Sousse', comment: 'Super initiative !' },\n" +
"        4: { title: 'Taille des arbres Avenue Bourguiba', category: 'Espaces Verts', desc: \"Les arbres obstruant la visibilité ont été taillés par l'équipe espaces verts.\", addr: 'Av. Habib Bourguiba, Sousse' },\n" +
"        5: { title: 'Réparation fuite eau Cité Ettaamir', category: 'Réseaux', desc: \"La fuite d'eau signalée a été colmatée et la chaussée remise en état.\", addr: 'Cité Ettaamir, Sousse', comment: 'Bien mais un peu lent.' },\n" +
"        6: { title: 'Panneau stop remplacé Rond-point Nord', category: 'Signalisation', desc: 'Le panneau stop endommagé a été remplacé par un neuf conforme aux normes.', addr: 'Rond-point Sousse Nord' }\n" +
"      },\n" +
"      projects: {\n" +
"        1: { title: 'Végétalisation de la Place des Martyrs', category: 'Espaces Verts', desc: \"Transformation de la place centrale en espace vert piétonnier avec 50 arbres et points d'eau écologiques. Projet approuvé par 73% des citoyens.\", duration: '3 mois' },\n" +
"        2: { title: \"Modernisation de l'Éclairage Public\", category: 'Éclairage', desc: 'Remplacement de 3000 lampadaires par des LED à détection de mouvement. Réduction de 60% de la consommation énergétique.', duration: '4 mois' },\n" +
"        3: { title: 'Bacs à Ordures Connectés', category: 'Propreté', desc: 'Installation de 200 bacs intelligents avec capteurs IoT pour optimiser les tournées de collecte.', duration: '2 mois' },\n" +
"        4: { title: 'Réfection du marché municipal', category: 'Infrastructures', desc: 'Rénovation complète des toitures et mise aux normes sanitaires du marché central de Sousse. Projet initié et financé par la municipalité.', duration: '6 mois' },\n" +
"        5: { title: \"Nouvelle station d'épuration Sousse Sud\", category: 'Réseaux', desc: \"Création d'une station d'épuration de dernière génération pour soulager le réseau sud. Projet mené par la commune.\", duration: '12 mois' }\n" +
"      }\n" +
"    },\n";

const frPropAdditions = "\n" +
"    mocks: {\n" +
"      1: { category: 'Espaces Verts', title: 'Végétalisation de la Place des Martyrs', desc: \"Ce projet vise à transformer la Place des Martyrs en un véritable poumon vert au cœur de Sousse. Il comprend la plantation d'arbres endémiques, l'installation de bancs ombragés, et la création d'un système d'irrigation écologique. L'objectif est de réduire les îlots de chaleur et d'offrir un espace de détente convivial pour les citoyens.\", duration: '3 mois' },\n" +
"      2: { category: 'Voirie', title: 'Extension des Pistes Cyclables', desc: 'Création de 12 km de nouvelles pistes cyclables sécurisées reliant les principaux quartiers de Sousse au centre-ville, avec des stations de vélos en libre-service.', duration: '6 mois' },\n" +
"      3: { category: 'Propreté', title: 'Bacs à Ordures Connectés', desc: 'Installation de 200 bacs à ordures intelligents équipés de capteurs IoT pour optimiser les tournées de collecte et réduire les débordements dans les rues.', duration: '2 mois' },\n" +
"      4: { category: 'Éclairage public', title: \"Modernisation de l'Éclairage Public\", desc: 'Remplacement de 3000 lampadaires par des modèles LED à détection de mouvement, réduisant la consommation énergétique de 60% et améliorant la sécurité nocturne.', duration: '4 mois' }\n" +
"    },\n";

if (!frContent.includes('mocks: {')) {
  frContent = frContent.replace(/(\s*)works:\s*\{/, '$1works: {' + frAdditions);
  frContent = frContent.replace(/(\s*)propositions:\s*\{/, '$1propositions: {' + frPropAdditions);
  fs.writeFileSync(frFile, frContent);
}
console.log("Done");
