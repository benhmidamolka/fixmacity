const { getNextGenAI, getKeysCount } = require('./gemini.rotation');
const fs = require('fs');
const path = require('path');

const CATEGORIES = [
  'Voirie',
  'Eclairage', 
  'Proprete',
  'Espaces verts',
  'Reseaux',
  'Signalisation',
  'Administratif',
  'Suggestions'
];

// ── Currently available Gemini models ─────────────────────────────────
const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro-002',
];

/**
 * Build a context-rich prompt that includes GPS and sensitive-location data
 * so the AI can factor nearby schools/hospitals into its priority assessment.
 */
function buildVisionPrompt(context = {}) {
  const { latitude, longitude, nearbyLocations, category } = context;

  let locationContext = '';
  if (latitude && longitude) {
    locationContext += `\nCOORDONNÉES GPS du signalement : ${latitude}, ${longitude} (Sousse, Tunisie).`;
  }
  if (nearbyLocations && nearbyLocations.length > 0) {
    locationContext += `\nLIEUX SENSIBLES À PROXIMITÉ :`;
    nearbyLocations.forEach(loc => {
      locationContext += `\n  - ${loc.type} "${loc.name || ''}" à ${loc.distance_m}m`;
    });
    locationContext += `\nIMPORTANT : La proximité d'un lieu sensible (école, hôpital, mosquée) AUGMENTE la priorité.`;
  }
  if (category) {
    locationContext += `\nCATÉGORIE présélectionnée par le citoyen : ${category}.`;
  }

  return `Tu es un expert en gestion urbaine municipale pour la ville de Sousse, Tunisie.
Analyse cette photo d'un problème urbain et réponds UNIQUEMENT en JSON valide avec cette structure exacte:

{
  "category": "une des catégories suivantes: Voirie, Eclairage, Proprete, Espaces verts, Reseaux, Signalisation, Administratif",
  "title": "titre court et descriptif du problème (max 60 caractères)",
  "description": "description détaillée du problème visible sur la photo (2-3 phrases)",
  "priority": "haute | moyenne | basse",
  "danger_score": 1 à 10,
  "is_hazard": true ou false,
  "hazard_details": "si is_hazard=true: décris le danger précisément, sinon null",
  "confidence": 0.0 à 1.0,
  "visible_issues": ["problème visible 1", "problème visible 2"],
  "near_sensitive_area": true ou false,
  "sensitive_area_impact": "description de l'impact sur la zone sensible si applicable, sinon null",
  "suggestions": ["conseil 1 pour la résolution", "conseil 2"]
}
${locationContext}

Règles de priorité:
- priority=haute si: risque électrique, trou profond, inondation, câble exposé, effondrement, danger immédiat pour personnes, OU si le problème est à proximité d'un lieu sensible (école, hôpital)
- priority=moyenne si: dégradation importante mais pas danger immédiat
- priority=basse si: problème esthétique, légère dégradation
- danger_score: 8-10 si danger immédiat + zone sensible, 5-7 si danger modéré, 1-4 si faible risque
- is_hazard=true si le problème peut blesser quelqu'un
- near_sensitive_area=true si un lieu sensible est mentionné ci-dessus OU visible sur la photo
- Réponds TOUJOURS en français
- NE génère RIEN d'autre que le JSON`;
}

/**
 * Main AI analysis — calls Gemini Vision with image + GPS context.
 * @param {string} imagePath - Path to the image file on disk
 * @param {object} context   - { latitude, longitude, nearbyLocations, category }
 */
exports.analyzePhoto = async (imagePath, context = {}) => {
  try {
    // Read image file
    if (!fs.existsSync(imagePath)) {
      throw new Error(`IMAGE_NOT_FOUND: ${imagePath}`);
    }
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    
    // Detect mime type
    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.jfif': 'image/jpeg'
    };
    const mimeType = mimeTypeMap[ext] || 'image/jpeg';

    const keyCount = getKeysCount();
    let result = null;
    let lastError = null;

    if (keyCount === 0) {
      throw new Error("CONFIGURATION_ERROR: Aucune clé Gemini n'est configurée dans le fichier .env.");
    }

    const prompt = buildVisionPrompt(context);

    // Try every key × every model
    for (let i = 0; i < keyCount; i++) {
      try {
        const genAI = getNextGenAI();
        let modelSuccess = false;

        for (const modelName of MODELS_TO_TRY) {
          try {
            const model = genAI.getGenerativeModel({ 
              model: modelName,
              generationConfig: {
                responseMimeType: "application/json",
              }
            });

            result = await model.generateContent([
              {
                inlineData: {
                  data: base64Image,
                  mimeType: mimeType
                }
              },
              prompt
            ]);

            if (result && result.response) {
              console.log(`[Vision] ✅ Success with model ${modelName} on key ${i + 1}`);
              modelSuccess = true;
              break;
            }
          } catch (modelErr) {
            console.warn(`[Vision] Model ${modelName} failed on key ${i + 1}:`, modelErr.message?.substring(0, 120));
            lastError = modelErr;
            // Quota (429), not found (404), or access denied (403) → try next
            if (modelErr.message?.includes('429') || modelErr.message?.includes('404') || modelErr.message?.includes('403')) continue; 
            else throw modelErr; 
          }
        }

        if (modelSuccess) break;
      } catch (err) {
        console.error(`[Vision] Key ${i + 1}/${keyCount} failed:`, err.message?.substring(0, 120));
        lastError = err;
      }
    }

    if (!result || !result.response) {
      console.error('[Vision] All keys/models failed. Last error:', lastError?.message);
      throw lastError || new Error("ALL_KEYS_FAILED: Toutes les clés Gemini ont échoué.");
    }

    let text = "";
    try {
      text = result.response.text();
    } catch (textErr) {
      console.error('[Vision] Could not get text from response:', textErr.message);
      if (result.response.candidates && result.response.candidates.length > 0) {
        const candidate = result.response.candidates[0];
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('PHOTO_BLOCKED: La photo a été bloquée par les filtres de sécurité.');
        }
      }
      throw new Error(`GEMINI_RESPONSE_ERROR: ${textErr.message}`);
    }

    if (!text) {
      throw new Error('GEMINI_EMPTY_RESPONSE: Réponse vide reçue de l\'IA.');
    }
    
    // Clean and parse JSON
    const cleanText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    let analysis;
    try {
      analysis = JSON.parse(cleanText);
    } catch (parseErr) {
      console.error('[Vision] JSON parse error. Raw text:', cleanText.substring(0, 200));
      throw new Error('Erreur de formatage de la réponse IA.');
    }
    
    // Validate category
    if (!CATEGORIES.includes(analysis.category)) {
      analysis.category = 'Voirie';
    }

    // Validate priority
    if (!['haute', 'moyenne', 'basse'].includes(analysis.priority)) {
      analysis.priority = 'moyenne';
    }

    // Ensure danger_score is a number 1-10
    analysis.danger_score = Math.max(1, Math.min(10, parseInt(analysis.danger_score) || 5));

    // Ensure visible_issues is an array
    if (!Array.isArray(analysis.visible_issues)) {
      analysis.visible_issues = [];
    }

    return {
      success: true,
      source: 'gemini_vision',
      ...analysis
    };
  } catch (err) {
    console.error('[Vision] Final catch:', err.message);
    throw err;
  }
};

/**
 * Fallback heuristic analysis when AI is unavailable.
 * Uses category, location sensitivity, and metadata to estimate priority.
 * @param {object} context - { category, latitude, longitude, nearbyLocations, description }
 */
exports.heuristicAnalysis = (context = {}) => {
  const { category, nearbyLocations, description } = context;

  // ── Category-based base score ──────────────────────────────────
  const categoryScores = {
    'Voirie':        6,   // Road issues are usually moderate-high
    'Eclairage':     5,   // Lighting = safety concern
    'Proprete':      3,   // Cleanliness = low-moderate
    'Espaces verts': 2,   // Green spaces = low
    'Reseaux':       7,   // Water/sewer = high
    'Signalisation': 5,   // Signage = moderate
    'Administratif': 2,   // Admin = low
    'Suggestions':   1,   // Suggestions = lowest
  };
  let dangerScore = categoryScores[category] || 4;

  // ── Sensitive location bonus ───────────────────────────────────
  let nearSensitive = false;
  let sensitiveType = null;
  if (nearbyLocations && nearbyLocations.length > 0) {
    nearSensitive = true;
    sensitiveType = nearbyLocations[0].type;
    // Hospital/school nearby: +3, other: +2
    const bonus = ['hospital', 'school', 'hopital', 'ecole'].includes(sensitiveType) ? 3 : 2;
    dangerScore = Math.min(10, dangerScore + bonus);
  }

  // ── Keyword detection in description ───────────────────────────
  const urgentKeywords = ['danger', 'urgent', 'blessure', 'effondrement', 'inondation', 'électrique', 'câble', 'trou', 'profond', 'fuite', 'gaz'];
  const desc = (description || '').toLowerCase();
  const hasUrgentKeyword = urgentKeywords.some(kw => desc.includes(kw));
  if (hasUrgentKeyword) {
    dangerScore = Math.min(10, dangerScore + 2);
  }

  // ── Map score to priority ──────────────────────────────────────
  let priority;
  if (dangerScore >= 7) priority = 'haute';
  else if (dangerScore >= 4) priority = 'moyenne';
  else priority = 'basse';

  return {
    success: true,
    source: 'heuristic_fallback',
    category:             category || 'Voirie',
    title:                '',          // citizen fills manually
    description:          '',          // citizen fills manually
    priority,
    danger_score:         dangerScore,
    is_hazard:            dangerScore >= 7,
    hazard_details:       hasUrgentKeyword ? 'Mots-clés de danger détectés dans la description.' : null,
    confidence:           0.4,         // low confidence for heuristic
    visible_issues:       [],
    near_sensitive_area:  nearSensitive,
    sensitive_area_impact: nearSensitive ? `Proximité d'un ${sensitiveType || 'lieu sensible'}` : null,
    suggestions:          ['Vérification sur site recommandée', 'Complétez la description manuellement'],
  };
};
