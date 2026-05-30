import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, User, Menu, X } from 'lucide-react'
import Logo from '../Logo'

const LINKS = [
  { label: 'Accueil',      href: '#home'      },
  { label: 'Services',     href: '#services'  },
  { label: 'Signalements', href: '#map'        },
  { label: 'Carte',        href: '#map'        },
  { label: 'Communauté',   href: '#community' },
]

const Navbar: React.FC = () => {
  const [open, setOpen]       = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white/80 backdrop-blur-sm'
    } border-b border-slate-100`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-28 flex items-center justify-between py-4">

        <Logo variant="dark" size="md" />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {LINKS.map(l => (
            <a key={l.label} href={l.href}
              className="text-sm font-semibold text-slate-600 hover:text-[#1557FF] transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button className="hidden md:flex p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all">
            <Bell className="w-5 h-5" />
          </button>
          <button className="hidden md:flex p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all">
            <User className="w-5 h-5" />
          </button>
          <Link to="/register"
            className="hidden md:flex items-center bg-[#1557FF] hover:bg-[#1040CC] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm shadow-blue-200">
            Signaler un problème
          </Link>
          <button className="md:hidden p-2 text-slate-600" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 flex flex-col gap-3">
          {LINKS.map(l => (
            <a key={l.label} href={l.href}
              className="text-sm font-semibold text-slate-600 py-1.5"
              onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link to="/register"
            className="mt-1 bg-[#1557FF] text-white font-semibold px-5 py-3 rounded-xl text-center text-sm"
            onClick={() => setOpen(false)}>
            Signaler un problème
          </Link>
        </div>
      )}
    </nav>
  )
}

export default Navbar
