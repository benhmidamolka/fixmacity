import React from 'react'
import { Link } from 'react-router-dom'
import Logo from '../Logo'
import { useScrollReveal } from '../../hooks/useScrollReveal'

const COLS = [
  {
    title: 'Navigation',
    links: [
      { label: 'Accueil',              to: '/'         },
      { label: 'Tous les services',    to: '#services' },
      { label: 'Signaler un problème', to: '/login' },
      { label: 'Carte interactive',    to: '#map'      },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Privacy Policy',       to: '#' },
      { label: "Termes d'utilisation", to: '#' },
      { label: 'Contact support',      to: '#' },
      { label: 'Open Data Portal',     to: '#' },
    ],
  },
  {
    title: 'Municipalité',
    links: [
      { label: 'City Hall',                   to: '#' },
      { label: 'Conseil Municipal',           to: '#' },
      { label: 'Événements',                  to: '#' },
      { label: 'Av. Habib Bourguiba, Sousse', to: '#' },
    ],
  },
]

const Footer: React.FC = () => {
  const gridRef   = useScrollReveal<HTMLDivElement>({ threshold: 0.05 })
  const bottomRef = useScrollReveal<HTMLDivElement>({ threshold: 0.05 })

  return (
    <footer className="pt-20 pb-10 text-white" style={{ background: '#0A1628' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Main grid — fade up */}
        <div ref={gridRef} className="reveal grid grid-cols-2 sm:grid-cols-4 gap-10 pb-14 border-b border-white/10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Logo variant="light" size="md" className="mb-5" />
            <p className="text-white/40 text-sm leading-relaxed">
              Plateforme citoyenne officielle de la municipalité de Sousse pour un environnement municipal sain et actif.
            </p>
          </div>

          {COLS.map(col => (
            <div key={col.title}>
              <p className="text-white font-bold text-xs uppercase tracking-widest mb-5">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-white/40 text-sm hover:text-white hover:translate-x-1 inline-block transition-all duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar — fade in */}
        <div ref={bottomRef} className="reveal pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs">
            © 2026 FixMaCity / Municipalité de Sousse. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            {['FR', 'AR', 'EN'].map(l => (
              <button
                key={l}
                className={`text-xs font-bold transition-colors hover:text-white ${l === 'FR' ? 'text-white' : 'text-white/30'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
