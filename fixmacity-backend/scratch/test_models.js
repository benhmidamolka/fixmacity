const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  const key = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('No API key found');
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(key);
    // There isn't a direct listModels in the simple genAI object usually, 
    // it's often through the admin API or just trying common names.
    // But let's try a quick test with 'gemini-1.5-flash' and 'gemini-1.5-flash-latest'
    
    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-exp'];
    
    for (const m of modelsToTry) {
      try {
        console.log(`\n--- Testing model: ${m} ---`);
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent("hi");
        console.log(`Success with ${m}: ${result.response.text()}`);
      } catch (e) {
        console.log(`Error with ${m}: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

listModels();
