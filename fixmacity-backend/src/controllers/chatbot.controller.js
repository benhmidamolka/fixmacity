const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../config/db');

exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    
    // 1. Fetch user's declarations
    const { data: decls } = await supabase.from('declarations')
      .select('ref_citoyen, category, status, title')
      .eq('citizen_id', req.user.id);

    // 2. Build minimalist context
    const context = `
      You are FixMaCity's AI Assistant. Be polite and concise.
      User's reports: ${JSON.stringify(decls || [])}
      User's query: "${message}"
      Please answer the user's query and summarize the status of their reports if relevant.
    `;

    // 3. Query Gemini Flash
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const result = await genAI.getGenerativeModel({ model: "gemini-2.5-flash" }).generateContent(context);
    
    res.json({ reply: result.response.text(), success: true });
  } catch (error) {
    console.error('[Chatbot Error]', error.message);
    res.status(500).json({ error: 'Failed to generate AI response.' });
  }
};
