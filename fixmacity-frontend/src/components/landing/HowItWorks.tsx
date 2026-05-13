import React from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

const STEPS = [
  {
    num: '1',
    color: '#1557FF',
    title: 'Signalez',
    desc: "Prenez une photo, décrivez le problème, et géolocalisez-le instantanément.",
  },
  {
    num: '2',
    color: '#F59E0B',
    title: 'On traite',
    desc: "La municipalité reçoit l'alerte, l'analyse et dépêche l'équipe technique compétente sur place.",
  },
  {
    num: '3',
    color: '#1557FF',
    title: 'Résolu',
    desc: "Une fois le problème réglé, vous recevez une notification et une photo de l'intervention terminée.",
  },
]

const HowItWorks: React.FC = () => {
  const headingRef  = useScrollReveal<HTMLDivElement>()
  const stepsRef    = useScrollReveal<HTMLDivElement>({ threshold: 0.1 })

  return (
    <section className="py-24 bg-white" id="how">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">

        {/* Heading — fade up */}
        <div ref={headingRef} className="reveal">
          <h2 className="text-4xl font-bold text-[#0A1628] mb-2">Comment ça marche ?</h2>
          <p className="text-slate-500 mb-16 max-w-xl mx-auto">
            Trois étapes simples pour transformer votre quartier et participer activement à la vie de Sousse.
          </p>
        </div>

        {/* Steps — staggered slide-up */}
        <div ref={stepsRef} className="grid sm:grid-cols-3 gap-10 relative stagger">
          {/* Connector */}
          <div className="hidden sm:block absolute top-10 left-[22%] right-[22%] h-px bg-slate-200" />

          {STEPS.map((step, i) => (
            <div key={i} className="reveal flex flex-col items-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-extrabold mb-6 relative z-10 shadow-lg"
                style={{ backgroundColor: step.color }}
              >
                {step.num}
              </div>
              <h3 className="text-xl font-bold text-[#0A1628] mb-3">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
