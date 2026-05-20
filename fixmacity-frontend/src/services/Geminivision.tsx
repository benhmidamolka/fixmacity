// ─── Gemini Vision Service ────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

export interface DeclarationAnalysis {
  source: 'gemini_vision' | 'heuristic_fallback'
  title: string
  description: string
  category: string
  urgency: 'faible' | 'moyen' | 'urgent'
  danger_score: number
  hazard: boolean
  hazard_note: string
  confidence: number
  visible_issues: string[]
  near_sensitive_area: boolean
  sensitive_area_impact: string | null
  suggestions: string[]
}

interface AnalyzeOptions {
  latitude?: number | null
  longitude?: number | null
  category?: string | null
}

export async function analyzeDeclarationPhoto(
  file: File,
  options: AnalyzeOptions = {}
): Promise<DeclarationAnalysis> {
  const token = localStorage.getItem('fmc_token')
  const formData = new FormData()
  formData.append('photo', file)

  // Append GPS coordinates and category for contextual AI analysis
  if (options.latitude)  formData.append('latitude',  String(options.latitude))
  if (options.longitude) formData.append('longitude', String(options.longitude))
  if (options.category)  formData.append('category',  options.category)

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
    source:               data.source || 'gemini_vision',
    title:                data.title || '',
    description:          data.description || '',
    category:             data.category || 'Autre',
    urgency:              priorityMap[data.priority] || 'moyen',
    danger_score:         data.danger_score || 5,
    hazard:               Boolean(data.is_hazard),
    hazard_note:          data.hazard_details || '',
    confidence:           data.confidence || 0.5,
    visible_issues:       data.visible_issues || [],
    near_sensitive_area:  data.near_sensitive_area || false,
    sensitive_area_impact: data.sensitive_area_impact || null,
    suggestions:          data.suggestions || [],
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

    if (analysis.near_sensitive_area) {
      response += `📍 **Zone sensible à proximité** : ${analysis.sensitive_area_impact || 'lieu sensible détecté'}. `;
    }
    
    response += `\n\nSouhaitez-vous que je crée un signalement pour vous avec ces détails ?`;
    
    return response;
  } catch (err) {
    console.error('[Chatbot Vision] Failed:', err);
    return "J'ai reçu votre photo mais je n'ai pas pu l'analyser pour le moment. Vous pouvez décrire le problème par écrit ou réessayer plus tard.";
  }
}
