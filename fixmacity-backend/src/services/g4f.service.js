// g4f.service.js — Safe backup layer for when Gemini fails
const axios = require('axios');

const G4F_URL = process.env.G4F_API_URL || 'http://localhost:1337/v1';
const G4F_TIMEOUT_MS = 8000; // never wait more than 8s

// Models to try in order — fastest/most reliable first
const FALLBACK_MODELS = ['gpt-4o-mini', 'llama-3.1-70b', 'gpt-4o'];

async function chat(messages, lang = 'fr') {
  for (const model of FALLBACK_MODELS) {
    try {
      const response = await axios.post(
        `${G4F_URL}/chat/completions`,
        { model, messages, max_tokens: 500 },
        { timeout: G4F_TIMEOUT_MS }
      );
      const reply = response.data?.choices?.[0]?.message?.content;
      if (reply) {
        console.log(`[G4F backup] Model ${model} succeeded`);
        return reply;
      }
    } catch (err) {
      console.warn(`[G4F backup] Model ${model} failed: ${err.message}`);
      // continue to next model
    }
  }
  // All G4F models failed — throw so caller knows
  throw new Error('G4F_ALL_MODELS_FAILED');
}

module.exports = { chat };