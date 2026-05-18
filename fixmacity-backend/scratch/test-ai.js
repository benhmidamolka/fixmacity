// scratch/test-ai.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { getNextGenAI, getKeysCount } = require('../src/services/gemini.rotation');

async function testModel(modelName) {
  const attempts = getKeysCount();
  for (let i = 0; i < attempts; i++) {
    try {
      const genAI = getNextGenAI();
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hello');
      const reply = result.response.text();
      console.log(`[SUCCESS] Model: ${modelName}, Key index: ${i}, Reply: ${reply.trim().slice(0, 50)}`);
      return true;
    } catch (err) {
      const shortErr = err.message.slice(0, 150);
      console.log(`[FAIL] Model: ${modelName}, Key index: ${i}, Error: ${shortErr}`);
    }
  }
  return false;
}

async function run() {
  const models = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-2.5-pro'];
  for (const model of models) {
    await testModel(model);
  }
}

run();
