// scratch/test-gemini-service.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const geminiService = require('../src/services/gemini.service');

async function run() {
  console.log('Testing updated Gemini service chat function...');
  const messages = [
    { role: 'user', parts: [{ text: 'You are Baladia' }] },
    { role: 'model', parts: [{ text: 'Compris.' }] },
    { role: 'user', parts: [{ text: 'Bonjour' }] }
  ];
  try {
    const reply = await geminiService.chat(messages, 'fr');
    console.log('SUCCESS! Gemini replied:', reply);
  } catch (err) {
    console.error('FAIL! Gemini chat failed:', err);
  }
}

run();
