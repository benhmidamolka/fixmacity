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

const VISION_PROMPT = `Tu es un expert en gestion urbaine municipale 
pour la ville de Sousse, Tunisie. Analyse cette photo d'un problème 
urbain et réponds UNIQUEMENT en JSON valide avec cette structure exacte:

{
  "category": "une des catégories suivantes: Voirie, Eclairage, Proprete, Espaces verts, Reseaux, Signalisation, Administratif",
  "title": "titre court et descriptif du problème (max 60 caractères)",
  "description": "description détaillée du problème visible sur la photo (2-3 phrases)",
  "priority": "haute | moyenne | basse",
  "is_hazard": true ou false,
  "hazard_details": "si is_hazard=true: décris le danger précisément, sinon null",
  "confidence": 0.0 à 1.0,
  "suggestions": ["conseil 1 pour la résolution", "conseil 2"]
}

Règles:
- priority=haute si: risque électrique, trou profond, inondation, 
  câble exposé, effondrement, danger immédiat pour personnes
- priority=moyenne si: dégradation importante mais pas danger immédiat
- priority=basse si: problème esthétique, légère dégradation
- is_hazard=true si le problème peut blesser quelqu'un
- Réponds TOUJOURS en français
- NE génère RIEN d'autre que le JSON`;

exports.analyzePhoto = async (imagePath) => {
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

    const attempts = getKeysCount();
    let result = null;
    let lastError = null;

    if (attempts === 0) {
      throw new Error("CONFIGURATION_ERROR: Aucune clé Gemini n'est configurée dans le fichier .env.");
    }

    for (let i = 0; i < attempts; i++) {
      try {
        const genAI = getNextGenAI();
        
        // Try models in order of capability/quota
        const modelsToTry = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
        let modelSuccess = false;

        for (const modelName of modelsToTry) {
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
              VISION_PROMPT
            ]);

            if (result && result.response) {
              modelSuccess = true;
              break; // Success with this model
            }
          } catch (modelErr) {
            console.warn(`[Vision] Model ${modelName} failed on key ${i + 1}:`, modelErr.message);
            lastError = modelErr;
            // If it's a quota error (429), model not found (404), or access denied (403), try next model/key
            if (modelErr.message?.includes('429') || modelErr.message?.includes('404') || modelErr.message?.includes('403')) continue; 
            else throw modelErr; 
          }
        }

        if (modelSuccess) break; // Success with this key!
      } catch (err) {
        console.error(`[Vision] Key ${i + 1}/${attempts} failed:`, err.message);
        lastError = err;
      }
    }

    if (!result || !result.response) {
      console.error('[Vision] All keys/models failed. Last error:', lastError);
      throw lastError || new Error("All Gemini keys/models failed");
    }

    let text = "";
    try {
      text = result.response.text();
    } catch (textErr) {
      console.error('[Vision] Could not get text from response (possibly blocked):', textErr.message);
      // Check if there are candidates
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
      console.error('[Vision] JSON parse error. Raw text:', cleanText);
      throw new Error('Erreur de formatage de la réponse IA.');
    }
    
    // Validate category
    if (!CATEGORIES.includes(analysis.category)) {
      analysis.category = 'Voirie'; // default fallback
    }

    // Validate priority
    if (!['haute', 'moyenne', 'basse'].includes(analysis.priority)) {
      analysis.priority = 'moyenne';
    }

    return {
      success: true,
      ...analysis
    };
  } catch (err) {
    console.error('[Vision] Final catch:', err.message);
    throw err;
  }
};
