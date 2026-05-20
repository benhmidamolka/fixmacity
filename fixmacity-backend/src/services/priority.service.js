/**
 * priority.service.js
 * Calculates priority_score (0–100) and priority_label ('faible'|'normal'|'urgent')
 * for every new declaration.
 *
 * Strategy:
 *   1. Try Gemini 2.0 Flash with a structured prompt (returns 0–100 + reasoning).
 *   2. On any failure / timeout, fall back to a deterministic algorithm that uses:
 *        - proximity to critical locations (hospitals, clinics, schools, fire stations)
 *        - vote count
 *        - category urgency weight
 *        - declaration age
 *   3. In both paths, votes boost the score by up to +15 points.
 *   4. scoreToLabel() maps the final score to a label.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Label thresholds ────────────────────────────────────────────────────────
const THRESHOLDS = { urgent: 70, normal: 40 }; // <40 = faible

function scoreToLabel(score) {
  if (score >= THRESHOLDS.urgent)  return 'urgent';
  if (score >= THRESHOLDS.normal)  return 'normal';
  return 'faible';
}

// ─── Category base urgency weights (0–40) ────────────────────────────────────
const CATEGORY_WEIGHT = {
  EA: 40, // Réseaux & Drainage — floods, water leaks
  EP: 35, // Éclairage Public — exposed cables, safety risk
  VR: 30, // Voirie & Routes — potholes, sinkholes
  ST: 25, // Signalisation Routière — missing signs, broken lights
  PD: 20, // Propreté & Déchets
  EV: 15, // Espaces Verts
  BP: 10, // Administratif
  SG:  5, // Suggestions
};

// ─── Critical locations in Sousse (lat, lng, radius_m, weight) ───────────────
// Add / update coordinates to match actual Sousse POIs.
const CRITICAL_LOCATIONS = [
  // Hospitals & clinics
  { name: 'CHU Farhat Hached',       lat: 35.8288, lng: 10.6408, radius: 500, weight: 30 },
  { name: 'Hôpital Sahloul',         lat: 35.8500, lng: 10.5900, radius: 500, weight: 30 },
  { name: 'Clinique Les Oliviers',   lat: 35.8270, lng: 10.6390, radius: 400, weight: 25 },
  { name: 'Polyclinique CNSS Sousse',lat: 35.8310, lng: 10.6370, radius: 400, weight: 25 },
  // Schools
  { name: 'Lycée Rue de Sousse',     lat: 35.8280, lng: 10.6370, radius: 300, weight: 20 },
  { name: 'École primaire Médina',   lat: 35.8260, lng: 10.6340, radius: 300, weight: 20 },
  // Fire stations
  { name: 'Protection civile Sousse',lat: 35.8320, lng: 10.6400, radius: 600, weight: 20 },
  // Main roads / intersections (high-traffic, accidents matter more)
  { name: 'Av. Habib Bourguiba',     lat: 35.8291, lng: 10.6380, radius: 200, weight: 15 },
  { name: 'Av. de la République',    lat: 35.8310, lng: 10.6360, radius: 200, weight: 15 },
];

// ─── Haversine distance (metres) ─────────────────────────────────────────────
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Vote boost: up to +15 pts (logarithmic, same in both paths) ──────────────
function voteBoost(votes) {
  if (!votes || votes <= 0) return 0;
  return Math.min(15, Math.round(5 * Math.log10(votes + 1)));
}

// ─── Fallback (deterministic) scoring ────────────────────────────────────────
function fallbackScore(declaration) {
  const { latitude, longitude, votes_count = 0, department_id, created_at } = declaration;

  // 1. Category weight (0–40)
  const categoryScore = CATEGORY_WEIGHT[department_id] ?? 15;

  // 2. Proximity score (0–30): highest weight among matched critical locations
  let proximityScore = 0;
  if (latitude && longitude) {
    for (const loc of CRITICAL_LOCATIONS) {
      const dist = haversineM(parseFloat(latitude), parseFloat(longitude), loc.lat, loc.lng);
      if (dist <= loc.radius) {
        proximityScore = Math.max(proximityScore, loc.weight);
      }
    }
  }

  // 3. Age boost (0–15): older unresolved issues are more pressing
  let ageScore = 0;
  if (created_at) {
    const ageDays = (Date.now() - new Date(created_at).getTime()) / 86400000;
    ageScore = Math.min(15, Math.round(ageDays * 0.5));
  }

  // 4. Vote boost (0–15)
  const vBoost = voteBoost(votes_count);

  const total = Math.min(100, categoryScore + proximityScore + ageScore + vBoost);
  return { score: total, method: 'fallback', proximityScore, categoryScore, ageScore, vBoost };
}

// ─── AI scoring via Gemini 2.0 Flash ─────────────────────────────────────────
async function aiScore(declaration) {
  if (!process.env.GEMINI_API_KEY) throw new Error('No GEMINI_API_KEY');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
Tu es un système d'évaluation de priorité pour la plateforme municipale FixMaCity de Sousse, Tunisie.
Évalue la PRIORITÉ de ce signalement citoyen et retourne UNIQUEMENT un objet JSON valide, sans Markdown.

SIGNALEMENT :
- Titre : ${declaration.title}
- Description : ${declaration.description || 'Non fournie'}
- Catégorie : ${declaration.category || declaration.department_id || 'Inconnue'}
- Arrondissement : ${declaration.delegation_id || 'Inconnu'}
- Latitude : ${declaration.latitude || 'Non fournie'}
- Longitude : ${declaration.longitude || 'Non fournie'}
- Votes : ${declaration.votes_count || 0}

CRITÈRES (score total 0–85, les votes ajoutent jusqu'à 15 pts séparément) :
1. Risque pour la sécurité publique immédiate (0–35) : danger de vie, blessures potentielles
2. Impact sur les services essentiels (0–25) : eau, électricité, routes principales, hôpitaux proches
3. Ampleur de l'impact (0–15) : nombre de personnes affectées, zone couverte
4. Urgence temporelle (0–10) : aggravation rapide si non traité

Réponds UNIQUEMENT avec ce JSON (pas de backticks, pas d'explication) :
{"ai_score": <entier 0-85>, "safety_risk": <0-35>, "service_impact": <0-25>, "population_impact": <0-15>, "temporal_urgency": <0-10>, "reasoning": "<max 80 chars en français>"}
`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s max

  try {
    const result = await model.generateContent(prompt);
    clearTimeout(timeout);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    if (typeof parsed.ai_score !== 'number') throw new Error('Invalid AI response');

    return {
      score: Math.min(85, Math.max(0, Math.round(parsed.ai_score))),
      method: 'ai',
      reasoning: parsed.reasoning || '',
      safety_risk: parsed.safety_risk,
      service_impact: parsed.service_impact,
      population_impact: parsed.population_impact,
      temporal_urgency: parsed.temporal_urgency,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Main exported function ───────────────────────────────────────────────────
/**
 * calculatePriorityScore(declaration)
 *
 * @param {object} declaration - declaration row (or form data before insert)
 * @returns {Promise<{ priority_score: number, priority_label: string, priority_method: string, priority_meta: object }>}
 */
async function calculatePriorityScore(declaration) {
  let baseResult;

  try {
    baseResult = await aiScore(declaration);
  } catch (err) {
    console.warn('[Priority] AI scoring failed, using fallback:', err.message);
    baseResult = fallbackScore(declaration);
  }

  // Votes always boost regardless of method (prevents double-counting for AI path)
  const boost = voteBoost(declaration.votes_count || 0);
  // For AI path, votes were NOT included in the 0–85 AI score, so we add them here.
  // For fallback path, boost was already included, but fallbackScore caps at 100, so re-capping is safe.
  const finalScore = Math.min(100, baseResult.score + (baseResult.method === 'ai' ? boost : 0));
  const label = scoreToLabel(finalScore);

  return {
    priority_score: finalScore,
    priority_label: label,
    priority_method: baseResult.method,
    priority_meta: {
      ...baseResult,
      vote_boost: boost,
      final_score: finalScore,
    },
  };
}

/**
 * recalculatePriorityAfterVote(declaration)
 * Called by the vote trigger / vote endpoint to update score when a vote is cast.
 * Same logic — just re-run calculatePriorityScore with updated votes_count.
 */
async function recalculatePriorityAfterVote(declaration) {
  return calculatePriorityScore(declaration);
}

module.exports = { calculatePriorityScore, recalculatePriorityAfterVote, scoreToLabel, fallbackScore };