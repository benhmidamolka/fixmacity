const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyDQeHXKpjOEPnjhUvaOgPMlhRtLfkdVGpk');

async function run() {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });
    const base64 = fs.readFileSync('uploads/analyze_1779110361084.jpg', 'base64');
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: 'image/jpeg' } },
      'Return {"category":"Voirie","title":"Test","description":"Test","priority":"haute","is_hazard":false,"hazard_details":null,"confidence":1,"suggestions":[]}'
    ]);
    console.log("SUCCESS:", result.response.text());
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
run();
