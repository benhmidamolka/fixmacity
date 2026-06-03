import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, CheckCircle, Zap, ArrowRight } from 'lucide-react'

const Hero: React.FC = () => {
  const badgeRef   = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const subRef     = useRef<HTMLParagraphElement>(null)
  const ctaRef     = useRef<HTMLDivElement>(null)
  const statsRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Staggered entrance animations on mount
    const els = [badgeRef, headingRef, subRef, ctaRef, statsRef]
    els.forEach((ref, i) => {
      const el = ref.current
      if (!el) return
      el.style.opacity = '0'
      el.style.transform = 'translateY(30px)'
      el.style.transition = `opacity 0.8s cubic-bezier(.16,1,.3,1) ${i * 120}ms, transform 0.8s cubic-bezier(.16,1,.3,1) ${i * 120}ms`
      requestAnimationFrame(() => {
        setTimeout(() => {
          el.style.opacity = '1'
          el.style.transform = 'none'
        }, 60)
      })
    })
  }, [])

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden pt-20 bg-[#060b19]">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
        {/* Large custom glowing radial blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[130px]" />
        <div className="absolute top-[40%] right-[20%] w-[35%] h-[35%] rounded-full bg-cyan-500/5 blur-[100px]" />
        
        {/* Architectural grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_80%,transparent_100%)] opacity-35" />
        
        {/* Shimmer overlay */}
        <div className="absolute inset-0 hero-shimmer opacity-30" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-32 w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left column: Text & CTA content */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {/* Badge */}
          <div ref={badgeRef} className="inline-flex self-start items-center gap-2 rounded-full px-4 py-1.5 mb-8 border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-300 text-xs font-bold uppercase tracking-widest">Plateforme Participative Sousse</span>
          </div>

          {/* Headline */}
          <h1 ref={headingRef} className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] max-w-3xl mb-6 tracking-tight">
            Signalez. Suivez.<br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Améliorez</span> votre ville.
          </h1>
          
          {/* Subtitle */}
          <p ref={subRef} className="text-slate-300 text-lg sm:text-xl max-w-xl mb-10 leading-relaxed font-normal">
            FixMaCity connecte les citoyens de Sousse avec les services municipaux pour signaler les anomalies, suivre les résolutions en temps réel et co-construire une ville plus agréable.
          </p>

          {/* CTAs */}
          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link to="/register"
              className="bg-[#1557FF] hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0 text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 group">
              Soumettre un signalement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login"
              className="border border-slate-700 hover:border-slate-500 hover:bg-slate-900/40 hover:-translate-y-0.5 active:translate-y-0 text-slate-200 font-bold px-8 py-4 rounded-xl text-base transition-all backdrop-blur-sm flex items-center justify-center">
              Suivre ma déclaration
            </Link>
          </div>

          {/* Stats */}
          <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-10 border-t border-slate-800">
            {[
              { value: '1 284', label: 'Déclarations', desc: 'Actives ou closes' },
              { value: '84%',   label: 'Résolution', desc: 'Taux moyen' },
              { value: '47',    label: 'Agents actifs', desc: 'Sur le terrain' },
              { value: '4.8★',  label: 'Satisfaction', desc: 'Note usagers' },
            ].map(s => (
              <div key={s.label} className="group transition-all duration-300 hover:translate-y-[-2px]">
                <p className="text-3xl font-extrabold text-white mb-0.5 group-hover:text-blue-400 transition-colors duration-300">{s.value}</p>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-slate-600 text-[10px] leading-tight font-medium">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Interactive Premium Dashboard mockups */}
        <div className="hidden lg:flex lg:col-span-5 relative w-full h-[550px] justify-center items-center select-none">
          {/* Abstract Glow and Mesh behind the cards */}
          <div className="absolute w-[350px] h-[350px] rounded-full bg-blue-600/10 blur-[100px] -z-10" />
          <div className="absolute w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[80px] -z-10" />

          {/* Map Mesh Drawing */}
          <div className="absolute inset-0 opacity-20 border border-slate-800/40 rounded-3xl overflow-hidden [mask-image:radial-gradient(circle_at_center,white_80%,transparent_100%)]">
            <svg className="w-full h-full text-slate-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.2">
              <path d="M 10 0 L 10 100 M 20 0 L 20 100 M 30 0 L 30 100 M 40 0 L 40 100 M 50 0 L 50 100 M 60 0 L 60 100 M 70 0 L 70 100 M 80 0 L 80 100 M 90 0 L 90 100" />
              <path d="M 0 10 L 100 10 M 0 20 L 100 20 M 0 30 L 100 30 M 0 40 L 100 40 M 0 50 L 100 50 M 0 60 L 100 60 M 0 70 L 100 70 M 0 80 L 100 80 M 0 90 L 100 90" />
              <circle cx="30" cy="40" r="1.2" fill="#1557FF" className="animate-pulse" />
              <circle cx="70" cy="30" r="1.5" fill="#10B981" />
              <circle cx="50" cy="65" r="1.2" fill="#F59E0B" />
              <circle cx="80" cy="75" r="1" fill="#1557FF" />
              <path d="M 30 40 L 50 65 L 70 30" stroke="#1557FF" strokeWidth="0.3" strokeDasharray="2 1" />
              <path d="M 50 65 L 80 75" stroke="#F59E0B" strokeWidth="0.3" />
            </svg>
          </div>

          {/* Floating Card 1: Main active incident */}
          <div className="absolute top-12 left-4 w-[310px] bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:border-slate-700/80 hover:bg-slate-900/90 group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs group-hover:scale-105 transition-transform">
                  #1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Signalement Actif</h4>
                  <p className="text-[10px] text-slate-400">il y a 2 minutes</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                En cours
              </span>
            </div>
            <p className="text-xs text-slate-200 font-semibold mb-2">Fuite d'eau majeure sur la chaussée</p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> Avenue du 14 Janvier, Sousse
            </p>
          </div>

          {/* Floating Card 2: Technical success resolve */}
          <div className="absolute bottom-12 right-4 w-[310px] bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:border-slate-700/80 hover:bg-slate-900/90 group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Résolution Confirmée</h4>
                  <p className="text-[10px] text-slate-400">il y a 14 minutes</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-full flex items-center gap-1">
                Résolu
              </span>
            </div>
            <p className="text-xs text-slate-200 font-semibold mb-2">Réparation de l'éclairage public</p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> Route de la Plage, Sousse
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-850 border border-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-300">
                  ES
                </div>
                <span className="text-[10px] text-slate-350">Équipe Technique Sousse</span>
              </div>
              <span className="text-[10px] text-slate-500">Durée: 2h 15m</span>
            </div>
          </div>

          {/* Glowing central node */}
          <div className="absolute top-[48%] left-[34%] -translate-x-1/2 -translate-y-1/2 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-full p-4.5 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer pin-pulse">
            <Zap className="w-5 h-5" />
          </div>
        </div>

      </div>
    </section>
  )
}

export default Hero
