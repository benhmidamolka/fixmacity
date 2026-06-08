'use strict';

/**
 * priority.service.js
 *
 * Computes a priority score (0–100) for a declaration using:
 *   1. Gemini Vision AI  — if the citizen uploaded a photo (primary)
 *   2. Heuristic fallback — votes + sensitive location proximity (always runs)
 *
 * Returned object:
 * {
 *   score: number,          // 0–100
 *   level: string,          // 'FAIBLE' | 'NORMAL' | 'URGENT'
 *   source: string,         // 'AI' | 'HEURISTIC'
 *   factors: object,        // breakdown of each factor
 *   ai_description: string  // Gemini's danger description (or null)
 * }
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs   = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ── Gemini client ─────────────────────────────────────────────────────────────
let genAI = null;
function getGenAI() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

// ── Sensitive places (hardcoded for Sousse — extend as needed) ────────────────
const SENSITIVE_PLACES = [
  { name: 'École primaire',   lat: 35.8278, lng: 10.6389, radius: 300 },
  { name: 'Hôpital Farhat',   lat: 35.8201, lng: 10.6341, radius: 400 },
  { name: 'Marché Central',   lat: 35.8245, lng: 10.6372, radius: 250 },
  { name: 'Médina de Sousse', lat: 35.8256, lng: 10.6369, radius: 500 },
  { name: 'Place des Martyrs',lat: 35.8312, lng: 10.6401, radius: 200 },
  { name: 'Gare de Sousse',   lat: 35.8289, lng: 10.6378, radius: 300 },
];

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearbySensitivePlace(lat, lng) {
  if (!lat || !lng) return null;
  for (const place of SENSITIVE_PLACES) {
    const dist = haversineDistance(lat, lng, place.lat, place.lng);
    if (dist <= place.radius) return place.name;
  }
  return null;
}

// ── Fetch image as base64 ─────────────────────────────────────────────────────
async function fetchImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith('https') ? https : http;
    protocol.get(imageUrl, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ data: buf.toString('base64'), mimeType: res.headers['content-type'] || 'image/jpeg' });
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Read local file as base64 ─────────────────────────────────────────────────
function readLocalImageAsBase64(photoUrl) {
  try {
    // photoUrl might be http://localhost:5005/uploads/filename.jpg
    const filename = path.basename(photoUrl.split('?')[0]);
    const filePath = path.join(__dirname, '..', '..', 'uploads', filename);
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase().replace('.', '');
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return { data: buf.toString('base64'), mimeType: mime };
    }
  } catch (e) {
    console.warn('[Priority] Could not read local image:', e.message);
  }
  return null;
}

// ── Gemini Vision analysis ────────────────────────────────────────────────────
async function analyzeImageWithGemini(imageData) {
  const client = getGenAI();
  if (!client) return null;

  try {
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Tu es un expert en sécurité urbaine pour la municipalité de Sousse, Tunisie.
Analyse cette photo d'un signalement citoyen et évalue le niveau de danger.

Réponds UNIQUEMENT avec ce JSON (aucun texte avant ou après) :
{
  "danger_score": <nombre entier de 0 à 40>,
  "danger_level": "<FAIBLE|MODERE|URGENT>",
  "description": "<description courte du danger en français, max 100 caractères>",
  "immediate_risk": <true|false>
}

Critères :
- 0-10 : problème esthétique ou mineur (graffiti, banc abîmé)
- 11-25 : risque modéré (nid-de-poule, éclairage défaillant, déchets)
- 26-35 : danger sérieux (trottoir effondré, fuite d'eau, arbre tombé)
- 36-40 : danger immédiat (câble électrique exposé, effondrement, danger vital)`;

    const result = await model.generateContent([
      prompt,
      { inlineData: imageData }
    ]);

    const text = result.response.text().trim();
    // Extract JSON from response (Gemini sometimes wraps in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      danger_score:  Math.min(40, Math.max(0, parseInt(parsed.danger_score) || 0)),
      danger_level:  parsed.danger_level || 'FAIBLE',
      description:   parsed.description || '',
      immediate_risk: !!parsed.immediate_risk,
    };
  } catch (e) {
    console.warn('[Priority] Gemini vision error:', e.message);
    return null;
  }
}

function computeVoteContribution(votes, maxPoints) {
  if (!votes || votes < 3) return 0;
  // Gives a small boost: 3 votes = ~20% of maxPoints, escalating to maxPoints at 20 votes.
  const effectiveVotes = Math.min(votes - 2, 20);
  return Math.round((effectiveVotes / 18) * maxPoints);
}

// ── Heuristic scoring (no AI) ─────────────────────────────────────────────────
function computeHeuristicScore(decl, sensitivePlaceName, isSensitiveVerified) {
  const voteScore    = computeVoteContribution(decl.votes_count, 20); // max 20 points
  const sensScore    = sensitivePlaceName ? (isSensitiveVerified ? 30 : 10) : 0;
  const hasPhoto     = !!(decl.photo_avant || decl.photo_url);
  const photoScore   = hasPhoto ? 10 : 0;                    // partial credit without AI
  const ageScore     = computeAgeScore(decl.created_at);    // 0–10 (older = more urgent)

  return {
    voteScore,
    sensScore,
    photoScore,
    ageScore,
    total: Math.min(100, voteScore + sensScore + photoScore + ageScore),
  };
}

function computeAgeScore(createdAt) {
  if (!createdAt) return 0;
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  // Escalates up to 10 points after 72 hours unresolved
  return Math.min(10, Math.round((ageHours / 72) * 10));
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
/**
 * computePriorityScore(decl)
 *
 * @param {object} decl - declaration row from DB
 * @returns {Promise<{score, level, source, factors, ai_description}>}
 */
async function computePriorityScore(decl) {
  let sensitivePlaceName = findNearbySensitivePlace(decl.latitude, decl.longitude);
  let isSensitiveVerified = !!sensitivePlaceName;
  
  // If GPS didn't find a hardcoded place, but the citizen explicitly checked "Lieu sensible"
  if (!sensitivePlaceName && decl.is_sensitive) {
    if (decl.sensitive_type === 'hospital') sensitivePlaceName = 'Hôpital (Déclaré - À vérifier)';
    else if (decl.sensitive_type === 'school') sensitivePlaceName = 'École (Déclaré - À vérifier)';
    else sensitivePlaceName = 'Lieu sensible (Déclaré - À vérifier)';
  }

  // ── Try Gemini Vision if photo exists ─────────────────────────────────────
  const photoUrl = decl.photo_avant || decl.photo_url;
  let aiResult   = null;

  const existingDangerScore = decl.ai_danger_score !== undefined 
    ? decl.ai_danger_score 
    : (decl.priority_meta?.factors?.ai_danger_score);

  if (decl.used_ai_vision && existingDangerScore !== undefined) {
    // If the frontend already processed the photo with Gemini and sent the results
    aiResult = {
      danger_score: existingDangerScore,
      danger_level: decl.ai_severity_label || decl.priority_label || 'FAIBLE',
      description: decl.ai_reasoning || decl.priority_meta?.ai_description || '',
      immediate_risk: decl.hazard || false,
    };
  } else if (photoUrl && process.env.GEMINI_API_KEY) {
    try {
      let imageData = null;

      // Try local file first (faster, no network)
      imageData = readLocalImageAsBase64(photoUrl);

      // Fall back to HTTP fetch for remote URLs
      if (!imageData && photoUrl.startsWith('http')) {
        imageData = await fetchImageAsBase64(photoUrl).catch(() => null);
      }

      if (imageData) {
        aiResult = await analyzeImageWithGemini(imageData);
      }
    } catch (e) {
      console.warn('[Priority] Image fetch/analysis failed:', e.message);
    }
  }

  // ── Compute heuristic factors (always) ───────────────────────────────────
  const h = computeHeuristicScore(decl, sensitivePlaceName, isSensitiveVerified);

  // ── Combine scores ────────────────────────────────────────────────────────
  let finalScore;
  let source;
  let aiDangerScore = 0;

  if (aiResult) {
    // AI available: AI danger (0-40) + votes (0-15) + sensitive (0-20) + age (0-10)
    aiDangerScore = aiResult.danger_score;
    const voteContrib  = computeVoteContribution(decl.votes_count, 15);
    const sensContrib  = sensitivePlaceName ? (isSensitiveVerified ? 20 : 10) : 0;
    const ageContrib   = computeAgeScore(decl.created_at);
    finalScore = Math.min(100, aiDangerScore + voteContrib + sensContrib + ageContrib);
    source = 'AI';
  } else {
    // Heuristic only
    finalScore = h.total;
    source = 'HEURISTIC';
  }

  // ── Determine level ───────────────────────────────────────────────────────
  let level;
  if (finalScore >= 70 || (aiResult && aiResult.immediate_risk)) {
    level = 'URGENT';
  } else if (finalScore >= 35) {
    level = 'NORMAL';
  } else {
    level = 'FAIBLE';
  }

  return {
    score: finalScore,
    level,
    source,
    factors: {
      ai_danger_score:   aiResult ? aiDangerScore : null,
      ai_immediate_risk: aiResult ? aiResult.immediate_risk : null,
      votes_count:       decl.votes_count || 0,
      vote_contribution: aiResult ? computeVoteContribution(decl.votes_count, 15) : h.voteScore,
      sensitive_place:       sensitivePlaceName,
      sensitive_contribution: aiResult ? (sensitivePlaceName ? (isSensitiveVerified ? 20 : 10) : 0) : h.sensScore,
      photo_available:        !!photoUrl,
      photo_contribution:     aiResult ? aiDangerScore : h.photoScore,
      age_hours:              Math.round((Date.now() - new Date(decl.created_at).getTime()) / 3600000),
      age_contribution:       computeAgeScore(decl.created_at),
    },
    ai_description: aiResult ? aiResult.description : null,
    ai_danger_level: aiResult ? aiResult.danger_level : null,
  };
}

module.exports = { computePriorityScore, findNearbySensitivePlace };                                                                                               