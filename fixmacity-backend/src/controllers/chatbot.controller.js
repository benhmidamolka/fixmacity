const supabase = require('../config/db');
const { validationResult } = require('express-validator');

const SYSTEM_PROMPT = `Tu es Baladia, l'assistant IA officiel de 
- Si la question est hors sujet, dis: "Je suis spécialisé pour les 
  services municipaux de Sousse. Je ne peux pas répondre à cela."
- Détecte automatiquement la langue (FR/AR/EN) et réponds dans la même
- Sois concis, poli et professionnel
- NE jamais inventer des informations sur des signalements spécifiques`;

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
      .limit(5);

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
    let result = null;
    let lastError = null;
    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\nContexte actuel:\n${userContext}`;

    for (let i = 0; i < attempts; i++) {
      try {
        const genAI = getNextGenAI();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
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
    return res.status(200).json({
      reply: "Je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.",
      success: false,
      error: err.message
    });
  }
};
