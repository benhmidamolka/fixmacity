const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model  = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

function containsImageData(text) {
  return text && (text.includes('data:image/') || text.includes('[image]') || text.includes('clipboard'));
}

const SYSTEM_PROMPT = `Tu es l'assistant de FixMaCity, plateforme municipale de Sousse.
Tu réponds UNIQUEMENT aux questions sur : la plateforme, les signalements,
les propositions, les statuts, la soumission, le compte.
Pour toute autre question, réponds exactement :
"Je ne sais pas. Pour plus d'informations, contactez la municipalité de Sousse."`;

/**
 * Send a message to Gemini and get a response.
 *
 * @param {Array}  history   Array of { role: 'user'|'model', parts: [{ text }] }
 * @param {string} userMsg   The latest user message
 * @param {string} context   Optional extra context (user declarations, etc.)
 * @returns {string}         Model reply text
 */
async function chat(history, userMsg, context = '') {
  if (containsImageData(userMsg)) {
    throw new Error('IMAGES_NOT_SUPPORTED');
  }
  
  const systemParts = context
    ? `${SYSTEM_PROMPT}\n\nContexte utilisateur :\n${context}`
    : SYSTEM_PROMPT;

  const chatSession = model.startChat({
    history: [
      { role: 'user',  parts: [{ text: systemParts }] },
      { role: 'model', parts: [{ text: 'Compris. Je suis prêt à aider.' }] },
      ...history,
    ],
  });

  const result = await chatSession.sendMessage(userMsg);
  return result.response.text();
}

module.exports = { chat };
