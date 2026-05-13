// ─── Gemini Vision Service ────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export interface DeclarationAnalysis {
  title: string
  description: string
  category: string
  urgency: 'faible' | 'moyen' | 'urgent'
  hazard: boolean
  hazard_note: string
}

export async function analyzeDeclarationPhoto(file: File): Promise<DeclarationAnalysis> {
  const token = localStorage.getItem('fmc_token')
  const formData = new FormData()
  formData.append('photo', file)

  // Switching to the more robust declarations/analyze-photo endpoint
  const res = await fetch(`${API}/declarations/analyze-photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!res.ok) throw new Error(`API error: ${res.status}`)

  const parsed = await res.json()
  const data = parsed.analysis || {}
  
  // Map priority (haute/moyenne/basse) to urgency (urgent/moyen/faible)
  const priorityMap: Record<string, 'faible' | 'moyen' | 'urgent'> = {
    'haute': 'urgent',
    'moyenne': 'moyen',
    'basse': 'faible'
  }

  return {
    title:       data.title || 'Signalement détecté',
    description: data.description || 'Problème identifié sur la photo.',
    category:    data.category || 'Autre',
    urgency:     priorityMap[data.priority] || 'moyen',
    hazard:      Boolean(data.is_hazard),
    hazard_note: data.hazard_details || '',
  }
}

export async function analyzeChatbotPhoto(file: File): Promise<string> {
  try {
    const analysis = await analyzeDeclarationPhoto(file);
    
    let response = `J'ai analysé votre photo : il s'agit d'un problème de **${analysis.category}** (${analysis.title}). `;
    response += `L'urgence est estimée comme **${analysis.urgency}**. `;
    
    if (analysis.hazard) {
      response += `⚠️ **Attention :** ${analysis.hazard_note || 'Un danger potentiel a été détecté.'} `;
    }
    
    response += `\n\nSouhaitez-vous que je crée un signalement pour vous avec ces détails ?`;
    
    return response;
  } catch (err) {
    console.error('[Chatbot Vision] Failed:', err);
    return "J'ai reçu votre photo mais je n'ai pas pu l'analyser pour le moment. Vous pouvez décrire le problème par écrit ou réessayer plus tard.";
  }
}
