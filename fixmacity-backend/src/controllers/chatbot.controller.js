// src/controllers/chatbot.controller.js
const supabase      = require('../config/db');
const { validationResult } = require('express-validator');
const geminiService = require('../services/gemini.service');
const g4fService    = require('../services/g4f.service');

// ─── System Prompt ───────────────────────────────────────────────────────────
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

// ─── Status label map ────────────────────────────────────────────────────────
const STATUS_MAP = {
  soumise:        'EN ATTENTE',
  assignee_chef:  'EN ATTENTE',
  assignee_agent: 'EN ATTENTE',
  en_cours:       'EN COURS',
  resolue:        'TERMINÉ',
  cloturee:       'TERMINÉ',
  refusee_chef:   'EN ATTENTE',
  refusee_agent:  'EN ATTENTE',
};

// ─── Graceful fallback replies ────────────────────────────────────────────────
function fallbackReply(lang = 'fr') {
  if (lang === 'ar') return 'عذراً، الخدمة غير متاحة حالياً. يرجى المحاولة مجدداً.';
  if (lang === 'en') return 'Sorry, the assistant is temporarily unavailable. Please try again.';
  return "Désolé, l'assistant est temporairement indisponible. Veuillez réessayer.";
}

// ─── Controller ──────────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { message, session_id, lang = 'fr' } = req.body;
  const userId = req.user?.id;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message requis.' });
  }

  try {
    // ── 1. Fetch user context ─────────────────────────────────────────────
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name, lang_pref')
      .eq('id', userId)
      .single();

    const { data: decls } = await supabase
      .from('declarations')
      .select('ref_citoyen, title, status, category, created_at')
      .or(`user_id.eq.${userId},citizen_id.eq.${userId}`)
      .is('deleted_at', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10);

    const userName = user ? `${user.first_name} ${user.last_name}` : 'Citoyen';

    let userContext = `Utilisateur connecté: ${userName}\n`;
    if (decls && decls.length > 0) {
      userContext += `Signalements récents:\n`;
      decls.forEach(d => {
        userContext += `- ${d.ref_citoyen}: "${d.title}" — ${STATUS_MAP[d.status] || d.status}\n`;
      });
    } else {
      userContext += `Aucun signalement trouvé pour cet utilisateur.\n`;
    }

    // ── 2. Load or create session ─────────────────────────────────────────
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

    // ── 3. Build conversation array for gemini.service / g4f.service ─────
    let rawMessages = session?.messages || [];
    if (typeof rawMessages === 'string') {
      try { rawMessages = JSON.parse(rawMessages); } catch (e) { rawMessages = []; }
    }
    if (!Array.isArray(rawMessages)) rawMessages = [];

    const history = rawMessages.map(m => ({
      role:  m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\nContexte actuel:\n${userContext}`;

    // messages = [system primer, primer ack, ...history, current user turn]
    const messages = [
      { role: 'user',  parts: [{ text: fullSystemPrompt }] },
      { role: 'model', parts: [{ text: `Compris. Je suis Baladia, prêt à aider ${userName}.` }] },
      ...history,
      { role: 'user',  parts: [{ text: message.trim() }] },
    ];

    // ── 4. STEP 1 — Try Gemini (primary, paid, reliable) ──────────────────
    let reply;

    try {
      reply = await geminiService.chat(messages, lang);
      console.log('[Chatbot] Gemini responded OK');
    } catch (geminiErr) {
      console.warn('[Chatbot] Gemini failed:', geminiErr.message);

      // ── 5. STEP 2 — Only use G4F if Gemini actually failed ──────────────
      if (process.env.USE_G4F !== 'false') {
        // G4F uses OpenAI-format messages (role/content), convert:
        const openAiMessages = messages.map(m => ({
          role:    m.role === 'model' ? 'assistant' : m.role,
          content: m.parts[0].text,
        }));

        try {
          reply = await g4fService.chat(openAiMessages, lang);
          console.log('[Chatbot] G4F backup responded OK');
        } catch (g4fErr) {
          console.error('[Chatbot] G4F backup also failed:', g4fErr.message);
        }
      }
    }

    // ── 6. STEP 3 — If both failed, return a graceful error (never crash) ─
    if (!reply) {
      return res.status(200).json({
        reply:    fallbackReply(lang),
        fallback: true,
        success:  false,
      });
    }

    // ── 7. Persist conversation to session ────────────────────────────────
    const updatedMessages = [
      ...rawMessages,
      { role: 'user',  content: message.trim(),         timestamp: new Date().toISOString() },
      { role: 'model', content: reply,                   timestamp: new Date().toISOString() },
    ];

    if (session?.id) {
      await supabase
        .from('chatbot_sessions')
        .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
        .eq('id', session.id);
    }

    return res.status(200).json({
      reply,
      session_id: session?.id,
      success:    true,
    });

  } catch (err) {
    // Truly unexpected error (DB failure, etc.)
    console.error('[Chatbot] Unexpected error:', err.message);
    return res.status(200).json({
      reply:   fallbackReply(lang),
      fallback: true,
      success:  false,
      error:    err.message,
    });
  }
};
