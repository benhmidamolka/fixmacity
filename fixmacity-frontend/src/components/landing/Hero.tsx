import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const HERO_IMG = '/sousse-hero-enhanced.png'

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
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background with parallax feel */}
      <div className="absolute inset-0 z-0">
        <img src={HERO_IMG} alt="Sousse" className="w-full h-full object-cover scale-105" style={{ transition: 'transform 20s linear' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(10,22,40,0.88) 0%, rgba(10,22,40,0.62) 50%, rgba(10,22,40,0.82) 100%)' }} />
        {/* Shimmer overlay */}
        <div className="absolute inset-0 hero-shimmer pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-24 w-full">
        {/* Badge */}
        <div ref={badgeRef} className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border border-white/20 bg-white/10 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-[#1557FF] animate-pulse" />
          <span className="text-white/90 text-xs font-bold uppercase tracking-widest">Municipalité de Sousse</span>
        </div>

        {/* Headline */}
        <h1 ref={headingRef} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] max-w-3xl mb-5 tracking-tight">
          Signalez. Suivez.<br />
          <span style={{ color: '#1557FF' }}>Améliorez</span> votre ville.
        </h1>
        <p ref={subRef} className="text-white/70 text-lg sm:text-xl max-w-xl mb-10 leading-relaxed">
          FixMaCity connecte les citoyens de Sousse avec leur municipalité pour résoudre les problèmes urbains rapidement et efficacement.
        </p>

        {/* CTAs */}
        <div ref={ctaRef} className="flex flex-wrap gap-4 mb-20">
          <Link to="/register"
            className="bg-[#1557FF] hover:bg-[#1040CC] hover:scale-105 text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-lg shadow-blue-900/40 flex items-center gap-2">
            Soumettre un signalement
          </Link>
          <Link to="/login"
            className="border border-white/30 hover:bg-white/10 hover:scale-105 text-white font-bold px-8 py-4 rounded-xl text-base transition-all backdrop-blur-sm">
            Suivre ma déclaration
          </Link>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-8 border-t border-white/10">
          {[
            { value: '1 284', label: 'Déclarations' },
            { value: '84%',   label: 'Taux résolution' },
            { value: '47',    label: 'Agents actifs' },
            { value: '4.8★',  label: 'Satisfaction' },
          ].map(s => (
            <div key={s.label} className="group">
              <p className="text-3xl font-extrabold text-white mb-1 group-hover:text-[#1557FF] transition-colors duration-300">{s.value}</p>
              <p className="text-white/50 text-sm uppercase tracking-wider font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero
