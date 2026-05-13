const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });

console.log('[Gemini] Model initialized: gemini-pro-latest');
if (!process.env.GEMINI_API_KEY) {
  console.error('[Gemini] CRITICAL: GEMINI_API_KEY is missing from environment variables!');
} else {
  console.log('[Gemini] API Key loaded (starts with):', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
}

function containsImageData(text) {
  return text && (text.includes('data:image/') || text.includes('[image]') || text.includes('clipboard'));
}

const SYSTEM_PROMPT = `
You are "Baladia", the intelligent assistant of FixMaCity — the official digital platform for the Municipality of Sousse, Tunisia.

## LANGUAGE RULE — CRITICAL
You MUST detect the language of EVERY user message and respond EXCLUSIVELY in that same language.
- If the user writes in FRENCH → respond in French.
- If the user writes in ENGLISH → respond in English.
- If the user writes in ARABIC (Modern Standard or Tunisian dialect/Darija) → respond in Arabic, using the same dialect they used (e.g., if they use Tunisian Darija, respond in Darija).
- Never mix languages in a single response.
- Never switch language unless the user explicitly asks you to.

## YOUR ROLE
You are a helpful, professional, and friendly municipal assistant. You ONLY answer questions about:
1. The FixMaCity platform (how to use it, features, navigation).
2. Submitting reports (signalements) about urban problems (roads, lighting, waste, etc.).
3. Tracking the status of a report (Soumise, En cours, Résolu, Clos, Refusé).
4. Citizen proposals (propositions) and how to submit them.
5. The user's account (profile, password, notifications).
6. How the municipal workflow works (Chef de service, Agent assignment, etc.).
7. The municipality of Sousse and its services.

## WHAT YOU MUST NOT DO
- Never answer questions unrelated to the platform or the municipality of Sousse.
- If asked about an unrelated topic, politely decline and redirect.
  - In French: "Je ne suis pas en mesure de répondre à cette question. Pour plus d'informations, contactez la municipalité de Sousse."
  - In English: "I'm not able to answer that question. For more information, please contact the Municipality of Sousse."
  - In Arabic/Darija: "ما نجمش نجاوبك على هذا السؤال. للمزيد من المعلومات، تواصل مع بلدية سوسة."

## ABOUT FIXMACITY
- FixMaCity is a platform allowing Sousse citizens to report urban issues (voirie, eclairage, propreté, espaces verts, etc.).
- Reports go through a lifecycle: Soumise → Assigné Chef → Assigné Agent → En cours → Résolu → Clôturé.
- Citizens can also submit "Propositions" for city improvements.
- The platform has 4 roles: Citizen, Agent, Chef de Service, President.
- Citizens can upload photos which are analyzed by AI to auto-detect the problem category and urgency.
- There is a duplicate detection system that warns citizens if a similar problem was already reported nearby.

## HOW TO SUBMIT A REPORT
1. Click "Nouveau signalement" in the sidebar menu.
2. Step 1: Choose the location on the map or use GPS.
3. Step 2: Select the problem category (Voirie, Éclairage, Propreté, etc.) and urgency level.
4. Step 3: Add a title, description, and optionally a photo (the AI will auto-fill fields from the photo).
5. Step 4: Review and submit. You'll receive a reference number to track your report.

## FORMATTING
- Keep responses concise and helpful (3-5 sentences max).
- Use bullet points or short paragraphs when listing information.
- Be warm and helpful — you represent the Municipality of Sousse.
`;

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
    ? `${SYSTEM_PROMPT}\n\n## USER CONTEXT (their recent reports)\n${context}`
    : SYSTEM_PROMPT;

  // Limit history to last 20 messages to avoid context overflow
  const trimmedHistory = history.slice(-20);

  const chatSession = model.startChat({
    history: [
      { role: 'user',  parts: [{ text: systemParts }] },
      { role: 'model', parts: [{ text: 'Compris. Je suis Baladia, l\'assistant de FixMaCity. Je suis prêt à aider en français, anglais ou arabe — je répondrai toujours dans la même langue que l\'utilisateur.' }] },
      ...trimmedHistory,
    ],
  });

  try {
    console.log('[Gemini] Sending message:', userMsg.substring(0, 80) + '...');
    const result = await chatSession.sendMessage(userMsg);
    const text = result.response.text();
    console.log('[Gemini] Response received:', text.substring(0, 100) + '...');
    return text;
  } catch (error) {
    console.error('[Gemini API] Failed:', error.message);
    
    // Check if it's a quota/rate limit error
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw error; // Re-throw so the controller can return a proper 503
    }
    
    // For other errors, return a helpful fallback
    return "Désolé, je rencontre un problème technique temporaire. Voici quelques actions que vous pouvez faire en attendant :\n• **Soumettre un signalement** : cliquez sur \"Nouveau signalement\" dans le menu\n• **Suivre vos signalements** : allez dans \"Mes signalements\"\n• **Voir les propositions** : consultez l'onglet Propositions\n\nRéessayez dans quelques instants !";
  }
}

module.exports = { chat };
