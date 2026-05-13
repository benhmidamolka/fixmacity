import React from 'react'
import { Wrench, Lightbulb, Trash2, Leaf, Network, TriangleAlert, FileText, MessageSquare, ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

const SERVICES = [
  { name: 'Voirie',         Icon: Wrench,        bg: '#f1f5f9', color: '#475569' },
  { name: 'Éclairage',      Icon: Lightbulb,     bg: '#fffbeb', color: '#d97706' },
  { name: 'Propreté',       Icon: Trash2,        bg: '#f0fdf4', color: '#16a34a' },
  { name: 'Espaces Verts',  Icon: Leaf,          bg: '#ecfdf5', color: '#059669' },
  { name: 'Réseaux',        Icon: Network,       bg: '#eff6ff', color: '#2563eb' },
  { name: 'Signalisation',  Icon: TriangleAlert, bg: '#fff1f2', color: '#e11d48' },
  { name: 'Administratif',  Icon: FileText,      bg: '#faf5ff', color: '#7c3aed' },
  { name: 'Suggestions',    Icon: MessageSquare, bg: '#fff7ed', color: '#ea580c' },
]

const ServicesGrid: React.FC = () => {
  const headingRef = useScrollReveal<HTMLDivElement>()
  const gridRef    = useScrollReveal<HTMLDivElement>({ threshold: 0.05 })

  return (
    <section className="py-20 bg-[#f7f9fb]" id="services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Heading */}
        <div ref={headingRef} className="reveal flex items-end justify-between mb-10">
          <div>
            <h2 className="text-4xl font-bold text-[#0A1628]">Domaines d'intervention</h2>
            <p className="text-slate-500 mt-2">Sélectionnez une catégorie pour voir les interventions en cours.</p>
          </div>
          <a href="#" className="hidden sm:flex items-center gap-1 text-[#1557FF] text-sm font-semibold hover:gap-2 transition-all">
            Tous les services <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Grid — staggered cards */}
        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger">
          {SERVICES.map((svc, i) => (
            <div
              key={svc.name}
              className="reveal bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-lg hover:-translate-y-1.5 hover:border-[#1557FF]/20 transition-all duration-300 cursor-pointer group"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: svc.bg }}
              >
                <svc.Icon className="w-5 h-5" style={{ color: svc.color }} />
              </div>
              <p className="font-bold text-[#0A1628] mb-2">{svc.name}</p>
              <a href="#" className="flex items-center gap-1 text-[#1557FF] text-xs font-semibold group-hover:gap-2 transition-all">
                Voir les signalements <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ServicesGrid
