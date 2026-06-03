const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../../fixmacity-frontend/src');

// 1. UPDATE LOCALES
const localesPath = path.join(srcDir, 'i18n', 'locales');
const frPath = path.join(localesPath, 'fr.ts');
const enPath = path.join(localesPath, 'en.ts');
const arPath = path.join(localesPath, 'ar.ts');

function updateLocale(file, newPropsStr, newMapStr) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Inject into propositions
  if (content.includes('propositions: {')) {
    content = content.replace(/propositions: \{([\s\S]*?)\},/g, `propositions: {$1${newPropsStr}\n  },`);
  }
  
  // Inject into map
  if (content.includes('map: {')) {
    content = content.replace(/map: \{([\s\S]*?)\},/g, `map: {$1${newMapStr}\n  },`);
  }
  
  fs.writeFileSync(file, content);
}

const frProps = `
    about: 'À propos du projet',
    duration: 'Durée',
    currentState: 'État actuel',
    votesFor: 'de votes "Pour"',
    closesIn: 'Ferme dans {{days}} jours',
    votingInProgress: 'Vote en cours',
    actionSaved: '✓ Action enregistrée',
    votingClosed: 'Période de vote terminée',
    imFor: 'Je suis Pour',
    imAgainst: 'Je suis Contre',
    citizenSupport: 'Soutien citoyen',
    daysLeft: '{{days}} jours restants',
    suggest: '💡 Suggérer une proposition',
    presidentProposals: 'Propositions du Président',
    presidentSubtitle: 'Votez pour les projets proposés par la présidence pour améliorer votre ville de Sousse.',
    allCategories: 'Toutes les catégories',
    notFound: 'Aucune proposition trouvée',
    notFoundDesc: 'Il n\\'y a pas de propositions correspondant à vos critères de sélection actuels.',
    pour: 'Pour',
    contre: 'Contre',`;
const frMap = `
    photoReport: 'Photo du signalement',
    photoAfter: '📸 Photo après intervention',
    photoAI: 'IA',`;

updateLocale(frPath, frProps, frMap);

const enProps = `
    about: 'About the project',
    duration: 'Duration',
    currentState: 'Current State',
    votesFor: 'of "For" votes',
    closesIn: 'Closes in {{days}} days',
    votingInProgress: 'Voting in progress',
    actionSaved: '✓ Action saved',
    votingClosed: 'Voting period closed',
    imFor: 'I am For',
    imAgainst: 'I am Against',
    citizenSupport: 'Citizen support',
    daysLeft: '{{days}} days left',
    suggest: '💡 Suggest a proposal',
    presidentProposals: 'President\\'s Proposals',
    presidentSubtitle: 'Vote for projects proposed by the presidency to improve your city of Sousse.',
    allCategories: 'All categories',
    notFound: 'No proposals found',
    notFoundDesc: 'There are no proposals matching your current selection criteria.',
    pour: 'For',
    contre: 'Against',`;
const enMap = `
    photoReport: 'Report Photo',
    photoAfter: '📸 Photo after intervention',
    photoAI: 'AI',`;

updateLocale(enPath, enProps, enMap);

const arProps = `
    about: 'حول المشروع',
    duration: 'المدة',
    currentState: 'الحالة الحالية',
    votesFor: 'من أصوات "مع"',
    closesIn: 'يغلق في {{days}} أيام',
    votingInProgress: 'التصويت جارٍ',
    actionSaved: '✓ تم حفظ الإجراء',
    votingClosed: 'انتهت فترة التصويت',
    imFor: 'أنا مع',
    imAgainst: 'أنا ضد',
    citizenSupport: 'دعم المواطنين',
    daysLeft: 'تبقى {{days}} أيام',
    suggest: '💡 اقتراح مبادرة',
    presidentProposals: 'مقترحات الرئيس',
    presidentSubtitle: 'قم بالتصويت للمشاريع المقترحة من قبل الرئاسة لتحسين مدينة سوسة.',
    allCategories: 'كل الفئات',
    notFound: 'لم يتم العثور على مقترحات',
    notFoundDesc: 'لا توجد مقترحات تتطابق مع معايير الاختيار الحالية الخاصة بك.',
    pour: 'مع',
    contre: 'ضد',`;
const arMap = `
    photoReport: 'صورة البلاغ',
    photoAfter: '📸 صورة بعد التدخل',
    photoAI: 'الذكاء الاصطناعي',`;

updateLocale(arPath, arProps, arMap);

// 2. UPDATE MAP PAGE
let mapPage = fs.readFileSync(path.join(srcDir, 'pages/Citizen/MapPage.tsx'), 'utf8');
if (!mapPage.includes('useTranslation')) {
  mapPage = mapPage.replace("import { useNavigate, useLocation } from 'react-router-dom'", "import { useNavigate, useLocation } from 'react-router-dom'\nimport { useTranslation } from 'react-i18next'");
}

mapPage = mapPage.replace(/function SidePanel.*?{/, (match) => {
  return match + '\n  const { t } = useTranslation();';
});

mapPage = mapPage.replace(/>Suivi de l\\'intervention</g, ">{t('map.followup')}<");
mapPage = mapPage.replace(/>Photo du signalement</g, ">{t('map.photoReport')}<");
mapPage = mapPage.replace(/>📸 Photo après intervention</g, ">{t('map.photoAfter')}<");
mapPage = mapPage.replace(/>Évaluation du citoyen</g, ">{t('map.citizenRating')}<");

mapPage = mapPage.replace(/const MapPage.*?{/, (match) => {
  return match + '\n  const { t } = useTranslation();';
});

mapPage = mapPage.replace(/Rechercher une adresse à Sousse\.\.\./g, "{t('map.searchAddress')}");
mapPage = mapPage.replace(/>Signaler avec photo</g, ">{t('map.reportWithAI')}<");
mapPage = mapPage.replace(/>IA</g, ">{t('map.photoAI')}<");
// Dropdown labels are dynamic but we can translate them or rely on STATUSES from categories
// Since we have specific variables:
mapPage = mapPage.replace(/const CATEGORIES      = \['Toutes catégories', 'Voirie', 'Éclairage', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation'\]/, "const CATEGORIES      = ['Toutes catégories', 'Voirie', 'Éclairage', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation']"); // wait, let's inject translation inside MapPage dynamically instead of global array
mapPage = mapPage.replace(/const ARRONDISSEMENTS = \['Tout Sousse', 'Sousse Ville', 'Sousse Jawhara', 'Sousse Sidi Abdelhamid'\]/g, "const ARRONDISSEMENTS = ['Tout Sousse', 'Sousse Ville', 'Sousse Jawhara', 'Sousse Sidi Abdelhamid']");
mapPage = mapPage.replace(/const STATUSES        = \['Tous statuts', 'Soumise', 'En cours', 'Résolue'\]/g, "const STATUSES        = ['Tous statuts', 'Soumise', 'En cours', 'Résolue']");

mapPage = mapPage.replace(/const \[catFilter,   setCatFilter\]   = useState\(CATEGORIES\[0\]\)/g, "const [catFilterIndex,   setCatFilterIndex]   = useState(0)");
mapPage = mapPage.replace(/const \[arrFilter,   setArrFilter\]   = useState\(ARRONDISSEMENTS\[0\]\)/g, "const [arrFilterIndex,   setArrFilterIndex]   = useState(0)");
mapPage = mapPage.replace(/const \[statFilter,  setStatFilter\]  = useState\(STATUSES\[0\]\)/g, "const [statFilterIndex,  setStatFilterIndex]  = useState(0)");

mapPage = mapPage.replace(/const matchCat  = catFilter  === CATEGORIES\[0\]  \|\| d.category === catFilter;/g, "const matchCat  = catFilterIndex === 0 || d.category === CATEGORIES[catFilterIndex];");
mapPage = mapPage.replace(/const matchArr  = arrFilter === ARRONDISSEMENTS\[0\] \|\| !d.arrondissement \|\| d.arrondissement === arrFilter;/g, "const matchArr  = arrFilterIndex === 0 || !d.arrondissement || d.arrondissement === ARRONDISSEMENTS[arrFilterIndex];");
mapPage = mapPage.replace(/const matchStat = statFilter === STATUSES\[0\]    \|\| cfg.label === statFilter;/g, "const matchStat = statFilterIndex === 0 || cfg.label === STATUSES[statFilterIndex];");

mapPage = mapPage.replace(/<Dropdown label="Catégorie"      options=\{CATEGORIES\}      value=\{catFilter\}  onChange=\{setCatFilter\}  \/>/, "{/* Categories */}\n          <DropdownIndex label={t('common.category')} options={[t('map.allCategories'), t('categories.voirie'), t('categories.eclairage'), t('categories.proprete'), t('categories.espaces_verts'), t('categories.reseaux'), t('categories.signalisation')]} valueIndex={catFilterIndex} onChange={setCatFilterIndex} />");
mapPage = mapPage.replace(/<Dropdown label="Arrondissement" options=\{ARRONDISSEMENTS\} value=\{arrFilter\}  onChange=\{setArrFilter\}  \/>/, "<DropdownIndex label=\"Arrondissement\" options={[t('map.allArrond'), 'Sousse Ville', 'Sousse Jawhara', 'Sousse Sidi Abdelhamid']} valueIndex={arrFilterIndex} onChange={setArrFilterIndex} />");
mapPage = mapPage.replace(/<Dropdown label="Statut"         options=\{STATUSES\}        value=\{statFilter\} onChange=\{setStatFilter\} \/>/, "<DropdownIndex label={t('common.status')} options={[t('map.allStatuses'), t('status.soumise'), t('status.en_cours'), t('status.resolue')]} valueIndex={statFilterIndex} onChange={setStatFilterIndex} />");

mapPage = mapPage.replace(/function Dropdown/, "function DropdownIndex({ label, options, valueIndex, onChange }: { label: string; options: string[]; valueIndex: number; onChange: (v:number)=>void }) {\n  const [open, setOpen] = useState(false)\n  return (\n    <div className=\"relative\">\n      <button onClick={() => setOpen(!open)}\n        className=\"flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-[#1557FF] dark:hover:border-blue-500 transition-all min-w-32\">\n        {valueIndex === 0 ? label : options[valueIndex]}\n        <ChevronDown className=\"w-4 h-4 ml-auto\" />\n      </button>\n      {open && (\n        <div className=\"absolute top-full mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-[1100] min-w-44 py-1\">\n          {options.map((o, i) => (\n            <button key={i} onClick={() => { onChange(i); setOpen(false) }}\n              className={`w-full text-left px-4 py-2 text-sm transition-colors ${valueIndex===i ? 'text-[#1557FF] dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/30' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>\n              {o}\n            </button>\n          ))}\n        </div>\n      )}\n    </div>\n  )\n}\n\nfunction Dropdown");

mapPage = mapPage.replace(/\{filtered\.length\} signalement\{filtered\.length!==1\?'s':''\}/g, "{filtered.length === 1 ? t('map.reportCount', { count: filtered.length }) : t('map.reportCountPlural', { count: filtered.length })}");

fs.writeFileSync(path.join(srcDir, 'pages/Citizen/MapPage.tsx'), mapPage);

// 3. UPDATE PROPOSITIONS PAGE
let propsPage = fs.readFileSync(path.join(srcDir, 'pages/Citizen/Propositions.tsx'), 'utf8');

if (!propsPage.includes('useTranslation')) {
  propsPage = propsPage.replace("import { ThumbsUp, ThumbsDown, UserCircle, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react'", "import { ThumbsUp, ThumbsDown, UserCircle, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react'\nimport { useTranslation } from 'react-i18next'");
}

propsPage = propsPage.replace(/function PropositionModal.*?{/, (match) => {
  return match + '\n  const { t } = useTranslation();';
});

propsPage = propsPage.replace(/>À propos du projet</g, ">{t('propositions.about')}<");
propsPage = propsPage.replace(/>Durée</g, ">{t('propositions.duration')}<");
propsPage = propsPage.replace(/>État actuel</g, ">{t('propositions.currentState')}<");
propsPage = propsPage.replace(/>de votes "Pour"</g, ">{t('propositions.votesFor')}<");
propsPage = propsPage.replace(/Ferme dans \{prop\.days_left\} jours/g, "{t('propositions.closesIn', { days: prop.days_left })}");
propsPage = propsPage.replace(/>Vote en cours</g, ">{t('propositions.votingInProgress')}<");
propsPage = propsPage.replace(/>✓ Action enregistrée</g, ">{t('propositions.actionSaved')}<");
propsPage = propsPage.replace(/>Période de vote terminée</g, ">{t('propositions.votingClosed')}<");
propsPage = propsPage.replace(/> Je suis Pour/g, "> {t('propositions.imFor')}");
propsPage = propsPage.replace(/> Je suis Contre/g, "> {t('propositions.imAgainst')}");

propsPage = propsPage.replace(/function PropCard.*?{/, (match) => {
  return match + '\n  const { t } = useTranslation();';
});

propsPage = propsPage.replace(/>Soutien citoyen</g, ">{t('propositions.citizenSupport')}<");
propsPage = propsPage.replace(/⏳ \{prop\.days_left\} jours restants/g, "⏳ {t('propositions.daysLeft', { days: prop.days_left })}");
propsPage = propsPage.replace(/> Pour</g, "> {t('propositions.pour')}");
propsPage = propsPage.replace(/> Contre</g, "> {t('propositions.contre')}");

propsPage = propsPage.replace(/const Propositions: React\.FC = \(\) => {/, (match) => {
  return match + '\\n  const { t } = useTranslation();\\n  const TABS = [t("propositions.tabs.all"), t("propositions.tabs.municipal"), t("propositions.tabs.voted")];';
});
// Remove global TABS
propsPage = propsPage.replace(/const TABS = \['Toutes les propositions', 'Projets municipaux', 'En cours de vote'\]\n/g, "");

propsPage = propsPage.replace(/>Propositions du Président</g, ">{t('propositions.presidentProposals')}<");
propsPage = propsPage.replace(/>Votez pour les projets proposés par la présidence pour améliorer votre ville de Sousse\.</g, ">{t('propositions.presidentSubtitle')}<");
propsPage = propsPage.replace(/>💡 Suggérer une proposition</g, ">{t('propositions.suggest')}<");
propsPage = propsPage.replace(/>Toutes les catégories</g, ">{t('propositions.allCategories')}<");
propsPage = propsPage.replace(/>Aucune proposition trouvée</g, ">{t('propositions.notFound')}<");
propsPage = propsPage.replace(/>Il n'y a pas de propositions correspondant à vos critères de sélection actuels\.</g, ">{t('propositions.notFoundDesc')}<");

fs.writeFileSync(path.join(srcDir, 'pages/Citizen/Propositions.tsx'), propsPage);

console.log('Successfully updated translations and injected them into MapPage and Propositions.');
