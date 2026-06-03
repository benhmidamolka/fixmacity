import React, { useState, useEffect, useRef } from 'react'
import { X, Send, Minimize2, Camera, AlertTriangle } from 'lucide-react'
import chatbotImg from '../../assets/chatbot.png'
import { analyzeChatbotPhoto } from '../../services/Geminivision'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

interface Message {
  role:    'user' | 'assistant'
  content: string
  time:    string
  image?:  string // base64 preview
}

const SUGGESTIONS = [
  'Comment soumettre un signalement ?',
  'Quel est le statut de ma déclaration ?',
  'Quels services sont disponibles ?',
  'Comment voter sur une proposition ?',
]

function now() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const ChatbotWidget: React.FC = () => {
  const [open,      setOpen]      = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages,  setMessages]  = useState<Message[]>([{
    role: 'assistant',
    content: "Bonjour ! Je suis Baladia, votre assistant municipal IA. Vous pouvez m'envoyer un message ou une 📷 photo d'un problème pour que je l'analyse automatiquement !",
    time: now(),
  }])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [unread,    setUnread]    = useState(0)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const token = localStorage.getItem('fmc_token')

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const addMessage = (msg: Message) => setMessages(prev => [...prev, msg])

  // ── Send text message ──────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    addMessage({ role: 'user', content: text.trim(), time: now() })
    setInput('')
    setLoading(true)
    try {
      const res  = await fetch(`${API}/chatbot/message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(sessionId ? { message: text.trim(), session_id: sessionId } : { message: text.trim() }),
      })
      const data = await res.json()
      console.log('[Chatbot] Response:', res.status, data)
      if (data.session_id) setSessionId(data.session_id)

      if (res.ok && (data.response || data.reply)) {
        addMessage({ role: 'assistant', content: data.response || data.reply, time: now() })
      } else if (data.error) {
        // Handle Gemini 429 quota exhaustion gracefully
        if (data.error.includes('429') || data.error.includes('quota') || data.error.includes('Too Many Requests')) {
          addMessage({ role: 'assistant', content: '⚠️ Le service est temporairement saturé. Veuillez réessayer dans quelques minutes.', time: now() })
        } else {
          // If the backend provided a friendly fallback reply, use it
          addMessage({ role: 'assistant', content: data.reply || `⚠️ Une erreur est survenue.`, time: now() })
        }
      } else {
        addMessage({ role: 'assistant', content: data.response || data.reply || data.message || "Je n'ai pas pu traiter votre demande.", time: now() })
      }
      if (!open) setUnread(p => p + 1)
    } catch (err) {
      console.error('[Chatbot] Connection error:', err)
      addMessage({ role: 'assistant', content: '❌ Problème de connexion au serveur. Vérifiez que le backend est actif sur le port 5005.', time: now() })
    } finally {
      setLoading(false)
    }
  }

  // ── Send photo to Gemini ───────────────────────────────────────────────────
  const handlePhoto = async (file: File) => {
    if (!file) return

    // Show preview in chat
    const reader = new FileReader()
    reader.onload = async e => {
      const preview = e.target?.result as string
      addMessage({ role: 'user', content: '📷 Photo envoyée', image: preview, time: now() })
      setLoading(true)

      // Show typing indicator
      try {
        const reply = await analyzeChatbotPhoto(file)
        addMessage({ role: 'assistant', content: reply, time: now() })
        if (!open) setUnread(p => p + 1)
      } catch {
        addMessage({
          role:    'assistant',
          content: "J'ai reçu votre photo mais je n'ai pas pu l'analyser. Réessayez ou décrivez le problème par écrit.",
          time:    now(),
        })
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  return (
    <>
      {/* ── Floating bubble ── */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[2000] w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
          style={{ background: '#1557FF' }}>
          <img src={chatbotImg} alt="Baladia" className="w-12 h-12 object-contain rounded-full" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {/* ── Chat window ── */}
      {open && (
        <div className="fixed bottom-6 right-6 z-[2000] flex flex-col rounded-3xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          style={{ width:'360px', height: minimized ? '64px' : '540px' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background:'#1557FF' }}>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0 bg-white/20">
              <img src={chatbotImg} alt="Baladia" className="w-full h-full object-cover scale-110" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none">Baladia</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white/70 text-[11px]">Assistant municipal · En ligne</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(!minimized)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all">
                <Minimize2 className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 items-end ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-slate-200">
                        <img src={chatbotImg} alt="Baladia" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="max-w-[78%]">
                      {msg.image && (
                        <img src={msg.image} alt="uploaded"
                          className="w-40 h-28 object-cover rounded-xl mb-1 ml-auto" />
                      )}
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-br-none text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none shadow-sm border border-slate-100 dark:border-slate-700'
                      }`} style={msg.role === 'user' ? { background:'#1557FF' } : {}}>
                        {msg.content}
                        <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60 text-right' : 'text-slate-400'}`}>
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex gap-2 items-end">
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                      <img src={chatbotImg} alt="Baladia" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"
                            style={{ animationDelay: `${i*0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggestions */}
              {messages.length === 1 && (
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="flex-shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold px-3 py-1.5 rounded-full hover:border-[#1557FF] dark:hover:border-[#1557FF] hover:text-[#1557FF] transition-all whitespace-nowrap">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* AI photo hint */}
              <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-[#1557FF] flex-shrink-0" />
                <p className="text-[11px] text-[#1557FF] font-medium">
                  Envoyez une photo — l'IA identifie le problème automatiquement
                </p>
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-2 px-3 py-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                {/* Hidden file input */}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])} />

                {/* Camera button */}
                <button onClick={() => fileRef.current?.click()} disabled={loading}
                  className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-[#1557FF] dark:hover:text-[#1557FF] hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all flex-shrink-0 disabled:opacity-40"
                  title="Envoyer une photo">
                  <Camera className="w-5 h-5" />
                </button>

                <input ref={inputRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrire un message..."
                  disabled={loading}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#1557FF] transition-all disabled:opacity-50"
                />

                <button onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                  style={{ background:'#1557FF' }}>
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default ChatbotWidget
