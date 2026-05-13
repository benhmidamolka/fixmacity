import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, ArrowRight } from 'lucide-react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

const PINS = [
  { x: '28%', y: '38%', color: '#F59E0B', label: 'Soumise'  },
  { x: '52%', y: '30%', color: '#1557FF', label: 'En cours' },
  { x: '43%', y: '58%', color: '#16a34a', label: 'Résolue'  },
  { x: '65%', y: '48%', color: '#94a3b8', label: 'Clôturée' },
  { x: '35%', y: '70%', color: '#e11d48', label: 'Refusée'  },
]

const LEGEND = [
  { color: '#F59E0B', label: 'Soumise'  },
  { color: '#1557FF', label: 'En cours' },
  { color: '#16a34a', label: 'Résolue'  },
  { color: '#94a3b8', label: 'Clôturée' },
  { color: '#e11d48', label: 'Refusée'  },
]

const MapSection: React.FC = () => {
  const headerRef = useScrollReveal<HTMLDivElement>()
  const mapRef    = useScrollReveal<HTMLDivElement>({ threshold: 0.1 })

  return (
    <section className="py-20" style={{ background: '#0f172a' }} id="map">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div ref={headerRef} className="reveal flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Signalements près de chez vous</h2>
            <p className="text-white/40 mt-1">Suivez en temps réel les interventions sur la carte interactive de Sousse.</p>
          </div>
          <Link to="/map" className="hidden sm:flex items-center gap-1 text-[#1557FF] text-sm font-semibold hover:gap-2 transition-all">
            Voir la carte <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Map placeholder — scale-in */}
        <div ref={mapRef} className="reveal-scale">
          <div
            className="relative h-80 rounded-2xl overflow-hidden border border-white/10"
            style={{ background: '#1e293b' }}
          >
            {/* Grid lines */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.15) 40px,rgba(255,255,255,0.15) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(255,255,255,0.15) 40px,rgba(255,255,255,0.15) 41px)',
              }}
            />

            {/* Shimmer overlay */}
            <div className="absolute inset-0 hero-shimmer pointer-events-none" />

            {/* Pins — pulse animation */}
            {PINS.map((pin, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-center cursor-pointer group"
                style={{ left: pin.x, top: pin.y, transform: 'translate(-50%,-50%)' }}
              >
                <div
                  className="w-5 h-5 rounded-full shadow-lg border-2 border-white/40 transition-transform group-hover:scale-150 pin-pulse"
                  style={{ backgroundColor: pin.color, color: pin.color, animationDelay: `${i * 400}ms` }}
                />
              </div>
            ))}

            {/* Legend */}
            <div
              className="absolute bottom-4 left-4 rounded-xl px-4 py-3 border border-white/10"
              style={{ background: 'rgba(10,22,40,0.92)' }}
            >
              <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider mb-2">Statut des signalements</p>
              {LEGEND.map(item => (
                <div key={item.label} className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-white/50 text-xs">{item.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Link
                to="/map"
                className="flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg text-sm hover:scale-105 hover:shadow-xl"
                style={{ background: '#1557FF' }}
              >
                <MapPin className="w-4 h-4" /> Ouvrir la carte interactive
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MapSection
