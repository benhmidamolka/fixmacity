const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean).map(k => k.trim());

let currentKeyIndex = 0;

function getNextGenAI() {
  if (GEMINI_KEYS.length === 0) {
    throw new Error('No Gemini API keys found in environment.');
  }
  const key = GEMINI_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  return new GoogleGenerativeAI(key);
}

function getKeysCount() {
  return GEMINI_KEYS.length;
}

module.exports = {
  getNextGenAI,
  getKeysCount
};
