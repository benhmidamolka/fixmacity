/**
 * gpt4free Service
 * Calls the g4f API (http://localhost:1337) with fallback model support
 * Models to try in order: gpt-4o-mini, gpt-4o, llama-3.1-70b
 */

const MODELS = ['gpt-4o-mini', 'gpt-4o', 'claude-3-haiku', 'llama-3.1-70b', 'gemini-pro'];
const G4F_API_URL = process.env.G4F_API_URL || 'http://localhost:1337';
const API_TIMEOUT = 60000; // 60 seconds

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
 * Call g4f API with a given model
 * @param {string} model - Model name (e.g., 'gpt-4o-mini')
 * @param {Array} messages - Array of message objects { role, content }
 * @returns {Promise<string>} - Response text or null if failed
 */
async function callModel(model, messages) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${G4F_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[g4f] Model ${model} returned HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    
    if (!text) {
      console.warn(`[g4f] Model ${model} returned empty response`);
      return null;
    }

    console.log(`[g4f] Model ${model} succeeded`);
    return text;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[g4f] Model ${model} timed out (${API_TIMEOUT}ms)`);
    } else {
      console.warn(`[g4f] Model ${model} failed: ${err.message}`);
    }
    return null;
  }
}

/**
 * Send a message to g4f with fallback model support
 * @param {Array} history - Chat history (last 20 messages)
 * @param {string} userMsg - Latest user message
 * @param {string} context - Optional context (user declarations, etc.)
 * @returns {Promise<string>} - Response text
 */
async function chat(history, userMsg, context = '') {
  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\n## USER CONTEXT (their recent reports)\n${context}`
    : SYSTEM_PROMPT;

  // Limit history to last 20 messages
  const trimmedHistory = history.slice(-20);

  // Build messages array
  const messages = [
    { role: 'system', content: systemContent },
    ...trimmedHistory,
    { role: 'user', content: userMsg },
  ];

  // Try each model in fallback order
  for (const model of MODELS) {
    try {
      console.log(`[g4f] Trying model: ${model}`);
      const response = await callModel(model, messages);
      
      if (response) {
        console.log(`[g4f] Success with ${model}: ${response.substring(0, 100)}...`);
        return response;
      }
    } catch (err) {
      console.error(`[g4f] Model ${model} error:`, err.message);
    }
  }

  // Fallback response if all models fail
  console.error('[g4f] All models exhausted');
  return "Désolé, je rencontre un problème technique temporaire. Voici quelques actions que vous pouvez faire en attendant :\n• **Soumettre un signalement** : cliquez sur \"Nouveau signalement\" dans le menu\n• **Suivre vos signalements** : allez dans \"Mes signalements\"\n• **Voir les propositions** : consultez l'onglet Propositions\n\nRéessayez dans quelques instants !";
}

module.exports = { chat };
