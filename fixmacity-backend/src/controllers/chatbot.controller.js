const supabase = require('../config/db');
const { validationResult } = require('express-validator');

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

exports.sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, session_id } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message requis.' });
    }

    // Get user context
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name, lang_pref')
      .eq('id', userId)
      .single();

    // Get user's recent declarations
    const { data: decls } = await supabase
      .from('declarations')
      .select('ref_citoyen, title, status, category, created_at')
      .or(`user_id.eq.${userId},citizen_id.eq.${userId}`)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build context string
    const userName = user ? `${user.first_name} ${user.last_name}` : 'Citoyen';
    
    const statusMap = {
      soumise: 'EN ATTENTE',
      assignee_chef: 'EN ATTENTE',
      assignee_agent: 'EN ATTENTE',
      en_cours: 'EN COURS',
      resolue: 'TERMINÉ',
      cloturee: 'TERMINÉ',
      refusee_chef: 'EN ATTENTE',
      refusee_agent: 'EN ATTENTE'
    };

    let userContext = `Utilisateur connecté: ${userName}\n`;
    if (decls && decls.length > 0) {
      userContext += `Signalements récents:\n`;
      decls.forEach(d => {
        userContext += `- ${d.ref_citoyen}: "${d.title}" — ${statusMap[d.status] || d.status}\n`;
      });
    } else {
      userContext += `Aucun signalement trouvé pour cet utilisateur.\n`;
    }

    // Get or create session
    let session = null;
    if (session_id) {
      const { data } = await supabase
        .from('chatbot_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('user_id', userId)
        .maybeSingle();
      session = data;
    }

    if (!session) {
      const { data: newSession } = await supabase
        .from('chatbot_sessions')
        .insert({ user_id: userId, messages: [] })
        .select('*')
        .single();
      session = newSession;
    }

    // Build conversation history
    let rawMessages = session?.messages || [];
    if (typeof rawMessages === 'string') {
      try { rawMessages = JSON.parse(rawMessages); } catch(e) { rawMessages = []; }
    }
    if (!Array.isArray(rawMessages)) rawMessages = [];

    const history = rawMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const { getNextGenAI, getKeysCount } = require('../services/gemini.rotation');
    
    const attempts = getKeysCount();
    if (attempts === 0) {
      return res.status(200).json({
        reply: "Le service IA n'est pas configuré (clé API manquante). Veuillez contacter l'administrateur.",
        success: false,
        error: "NO_API_KEYS"
      });
    }
    let result = null;
    let lastError = null;
    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\nContexte actuel:\n${userContext}`;

    if (attempts === 0) {
      throw new Error("CONFIGURATION_ERROR: Aucune clé Gemini n'est configurée dans le fichier .env.");
    }

    for (let i = 0; i < attempts; i++) {
      try {
        const genAI = getNextGenAI();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        const chat = model.startChat({
          history: [
            {
              role: 'user',
              parts: [{ text: fullSystemPrompt }]
            },
            {
              role: 'model',
              parts: [{ text: `Compris. Je suis Baladia, prêt à aider ${userName}.` }]
            },
            ...history
          ]
        });

        result = await chat.sendMessage(message.trim());
        break; // Success
      } catch (err) {
        console.error(`[Chatbot] Key ${i+1}/${attempts} failed:`, err.message);
        lastError = err;
      }
    }

    if (!result) {
      throw lastError || new Error("All Gemini keys failed");
    }

    const reply = result.response.text();

    // Save to session
    const updatedMessages = [
      ...rawMessages,
      { role: 'user', content: message.trim(), timestamp: new Date().toISOString() },
      { role: 'model', content: reply, timestamp: new Date().toISOString() }
    ];

    if (session?.id) {
      await supabase
        .from('chatbot_sessions')
        .update({ 
          messages: updatedMessages, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', session.id);
    }

    return res.status(200).json({ 
      reply, 
      session_id: session?.id,
      success: true 
    });

  } catch (err) {
    console.error('[Chatbot] Error:', err.message);
    
    // Return a fallback message instead of crashing
    const isQuotaError = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Too Many Requests');
    
    return res.status(200).json({
      reply: isQuotaError 
        ? "Le service est temporairement saturé. Veuillez réessayer dans quelques instants."
        : "Je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.",
      success: false,
      error: err.message
    });
  }
};
