import React from 'react'
import { Star } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

const TESTIMONIALS = [
  { name: 'Ahmed B.',   initials: 'AB', rating: 5, text: "Signalement traité en moins de 48h. Le trou dans la chaussée devant chez moi est réparé, merci !" },
  { name: 'Sonia M.',   initials: 'SM', rating: 5, text: "Application très intuitive. J'ai pu suivre l'avancement de mon signalement en temps réel." },
  { name: 'Mohamed K.', initials: 'MK', rating: 4, text: "Bonne initiative de la municipalité. Le service éclairage a été très réactif suite à mon signalement." },
]

const Testimonials: React.FC = () => {
  const headingRef = useScrollReveal<HTMLDivElement>()
  const gridRef    = useScrollReveal<HTMLDivElement>({ threshold: 0.1 })

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">

        <div ref={headingRef} className="reveal">
          <h2 className="text-4xl font-bold text-[#0A1628] mb-2">Ce que disent les citoyens</h2>
          <p className="text-slate-500 mb-14">La voix des habitants de Sousse qui utilisent FixMaCity au quotidien.</p>
        </div>

        <div ref={gridRef} className="grid sm:grid-cols-3 gap-6 stagger">
          {TESTIMONIALS.map(t => (
            <div
              key={t.name}
              className="reveal bg-slate-50 rounded-2xl p-6 text-left border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: '#1557FF' }}
                >
                  {t.initials}
                </div>
                <span className="font-bold text-[#0A1628] text-sm">{t.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
