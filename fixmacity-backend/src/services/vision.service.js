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
  // Read image file
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString('base64');
  
  // Detect mime type
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };
  const mimeType = mimeTypeMap[ext] || 'image/jpeg';

  const attempts = getKeysCount();
  let result = null;
  let lastError = null;

  for (let i = 0; i < attempts; i++) {
    try {
      if (getKeysCount() === 0) {
        throw new Error("CONFIGURATION_ERROR: Aucune clé Gemini n'est configurée dans le fichier .env.");
      }
      const genAI = getNextGenAI();
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

      result = await model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        VISION_PROMPT
      ]);
      break; // Success!
    } catch (err) {
      console.error(`[Vision] Key ${i + 1}/${attempts} failed:`, err.message);
      lastError = err;
    }
  }

  if (!result) {
    throw lastError || new Error("All Gemini keys failed");
  }

  try {
    const text = result.response.text();
    
    // Clean and parse JSON
    const cleanText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const analysis = JSON.parse(cleanText);
    
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
    console.error('[Vision] Parse error:', err.message);
    throw new Error('Failed to parse Gemini response');
  }
};
