// gemini.service.js — Primary AI layer using key rotation
const { getNextGenAI, getKeysCount } = require('./gemini.rotation');

const MODELS_TO_TRY = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

/**
 * Send a conversation to Gemini using key rotation + model fallback.
 * @param {Array<{role: string, parts: [{text: string}]}>} messages
 *   Full conversation array: system primer + history + current user turn.
 * @param {string} lang
 * @returns {Promise<string>} The assistant reply text.
 * @throws if all keys/models fail.
 */
async function chat(messages, lang = 'fr') {
  const attempts = getKeysCount();
  if (attempts === 0) {
    throw new Error('GEMINI_NO_KEYS: No Gemini API keys configured.');
  }

  // messages format expected:
  //   [0] { role: 'user',  parts: [{ text: systemPromptText }] }
  //   [1] { role: 'model', parts: [{ text: primerReply }] }
  //   [...history...]
  //   last: { role: 'user', parts: [{ text: userMessage }] }
  //
  // We pop the last user message as the sendMessage() call,
  // everything before becomes startChat history.
  const lastMsg = messages[messages.length - 1];
  const userText = lastMsg?.parts?.[0]?.text || '';
  const history  = messages.slice(0, -1);

  let lastError = null;

  for (let i = 0; i < attempts; i++) {
    for (const modelName of MODELS_TO_TRY) {
      try {
        const genAI = getNextGenAI();
        const model = genAI.getGenerativeModel({ model: modelName });
        const chatSession = model.startChat({ history });
        const result = await chatSession.sendMessage(userText);
        const reply  = result.response.text();
        if (reply) {
          console.log(`[Gemini] OK — key ${i + 1}/${attempts}, model: ${modelName}`);
          return reply;
        }
      } catch (err) {
        console.warn(`[Gemini] key ${i + 1}/${attempts} / model ${modelName}: ${err.message}`);
        lastError = err;
        // On quota error, try next model; on other errors, break inner loop
        if (!err.message?.includes('429')) break;
      }
    }
  }

  throw lastError || new Error('GEMINI_ALL_KEYS_FAILED');
}

module.exports = { chat };
