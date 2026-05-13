import React from 'react'
import { Link } from 'react-router-dom'
import { Send, Zap, ImageIcon, ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import chatbotImg from '../../assets/chatbot.png'

const ChatbotSection: React.FC = () => {
  const chatRef  = useScrollReveal<HTMLDivElement>({ threshold: 0.1 })
  const textRef  = useScrollReveal<HTMLDivElement>({ threshold: 0.1 })

  return (
    <section className="py-24 overflow-hidden relative" style={{ background: '#0A1628' }}>
      {/* Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
        style={{ background: 'rgba(21,87,255,0.12)', marginRight: '-200px', marginTop: '-200px' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

        {/* ── Left: chat UI — slides from left */}
        <div ref={chatRef} className="reveal-left relative flex justify-center">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-[380px]">

            {/* Header */}
            <div className="p-5 flex items-center gap-4" style={{ background: '#1557FF' }}>
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0 bg-white/20">
                <img src={chatbotImg} alt="Baladia" className="w-full h-full object-cover scale-110" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Baladia</p>
                <p className="text-white/60 text-[11px] font-semibold uppercase tracking-widest">Assistant municipal IA</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/70 text-[11px]">En ligne 24h/24</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="p-5 space-y-4 bg-slate-50 min-h-[260px]">
              <div className="flex gap-3 items-end">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-slate-200">
                  <img src={chatbotImg} alt="Baladia" className="w-full h-full object-cover" />
                </div>
                <div className="bg-white p-3.5 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 text-sm text-slate-700 max-w-[78%] leading-relaxed">
                  Bonjour ! Je suis Baladia. Comment puis-je vous aider à améliorer Sousse aujourd'hui ?
                </div>
              </div>
              <div className="flex gap-3 flex-row-reverse items-end">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: '#1557FF' }}>C</div>
                <div className="p-3.5 rounded-2xl rounded-br-none shadow-sm text-sm text-white max-w-[78%] leading-relaxed"
                  style={{ background: '#1557FF' }}>
                  Je veux signaler un problème d'éclairage dans ma rue.
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-slate-200">
                  <img src={chatbotImg} alt="Baladia" className="w-full h-full object-cover" />
                </div>
                <div className="bg-white p-3.5 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 text-sm text-slate-700 max-w-[78%] leading-relaxed">
                  Très bien ! Pouvez-vous me dire le nom de la rue ou partager votre position ?
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100 bg-white flex gap-2 items-center">
              <div className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-slate-400 text-sm">
                Écrire un message...
              </div>
              <button className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform"
                style={{ background: '#1557FF' }}>
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Floating Baladia character */}
          <div className="absolute -bottom-8 -right-6 w-28 h-28 pointer-events-none select-none hidden md:block drop-shadow-2xl">
            <img src={chatbotImg} alt="Baladia" className="w-full h-full object-contain"
              style={{ animation: 'float 3s ease-in-out infinite' }} />
          </div>
        </div>

        {/* ── Right: text — slides from right */}
        <div ref={textRef} className="reveal-right text-white">
          <p className="text-[#F59E0B] font-bold uppercase tracking-widest text-xs mb-4">
            Baladia : Votre assistant intelligent
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Posez vos questions<br />à Baladia
          </h2>
          <p className="text-white/60 mb-10 leading-relaxed text-[17px]">
            Notre assistant IA répond 24h/24 à toutes vos interrogations concernant les services municipaux, les procédures administratives et le suivi de vos signalements.
          </p>

          <div className="space-y-6 mb-10">
            {[
              { Icon: Zap,       title: 'Ultra-rapide',      desc: 'Signalez un problème en moins de 30 secondes via chat.' },
              { Icon: ImageIcon, title: "Analyse d'images",  desc: "Envoyez une photo, l'IA identifie automatiquement le type de problème." },
            ].map(({ Icon, title, desc }, i) => (
              <div key={i} className="flex gap-4 items-start group">
                <div className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-[#1557FF]/30 flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                  <Icon className="w-5 h-5" style={{ color: '#1557FF' }} />
                </div>
                <div>
                  <h5 className="font-bold mb-1">{title}</h5>
                  <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Link to="/login"
            className="inline-flex items-center gap-2 font-bold px-7 py-4 rounded-xl transition-all shadow-lg text-white text-[15px] hover:scale-105"
            style={{ background: '#F59E0B' }}>
            Discuter avec Baladia <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </section>
  )
}

export default ChatbotSection
