const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const listResult = await genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }).generateContent('Say hello in JSON: {"status":"ok"}');
    console.log("gemini-2.0-flash SUCCESS:", listResult.response.text().substring(0, 80));
  } catch (e) {
    console.error("gemini-2.0-flash FAILED:", e.message.substring(0, 200));
  }
  
  try {
    const r2 = await genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' }).generateContent('Say hello in JSON: {"status":"ok"}');
    console.log("gemini-2.0-flash-lite SUCCESS:", r2.response.text().substring(0, 80));
  } catch (e) {
    console.error("gemini-2.0-flash-lite FAILED:", e.message.substring(0, 200));
  }

  try {
    const r3 = await genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' }).generateContent('Say hello in JSON: {"status":"ok"}');
    console.log("gemini-2.5-flash-preview-05-20 SUCCESS:", r3.response.text().substring(0, 80));
  } catch (e) {
    console.error("gemini-2.5-flash-preview-05-20 FAILED:", e.message.substring(0, 200));
  }

  try {
    const r4 = await genAI.getGenerativeModel({ model: 'gemini-2.5-pro-preview-05-06' }).generateContent('Say hello in JSON: {"status":"ok"}');
    console.log("gemini-2.5-pro-preview-05-06 SUCCESS:", r4.response.text().substring(0, 80));
  } catch (e) {
    console.error("gemini-2.5-pro-preview-05-06 FAILED:", e.message.substring(0, 200));
  }
}
run();
