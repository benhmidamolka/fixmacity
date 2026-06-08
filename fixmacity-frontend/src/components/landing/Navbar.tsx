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
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 select-none ${
      scrolled 
        ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/50 shadow-sm py-3 h-20' 
        : 'bg-transparent border-b border-transparent py-5 h-24'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">

        <Logo variant={scrolled ? "dark" : "light"} size="md" />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {LINKS.map(l => (
            <a key={l.label} href={l.href}
              className={`text-sm font-semibold transition-all hover:-translate-y-[1px] ${
                scrolled ? 'text-slate-600 hover:text-[#1557FF]' : 'text-white/80 hover:text-white'
              }`}>
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button className={`hidden md:flex p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${
            scrolled ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}>
            <Bell className="w-5 h-5" />
          </button>
          <button className={`hidden md:flex p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${
            scrolled ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}>
            <User className="w-5 h-5" />
          </button>
          <Link to="/login"
            className="hidden md:flex items-center bg-[#1557FF] hover:bg-blue-600 hover:scale-[1.02] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">
            Signaler un problème
          </Link>
          <button className={`md:hidden p-2 rounded-lg ${
            scrolled ? 'text-slate-600 hover:bg-slate-100' : 'text-white hover:bg-white/10'
          }`} onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-slate-100 px-6 py-6 flex flex-col gap-4 shadow-xl animate-in">
          {LINKS.map(l => (
            <a key={l.label} href={l.href}
              className="text-sm font-semibold text-slate-600 py-1.5 border-b border-slate-50 hover:text-[#1557FF]"
              onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <div className="flex gap-4 pt-2">
            <button className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50">
              <Bell className="w-5 h-5" /> Notifications
            </button>
            <button className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50">
              <User className="w-5 h-5" /> Compte
            </button>
          </div>
          <Link to="/login"
            className="w-full bg-[#1557FF] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl text-center text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            onClick={() => setOpen(false)}>
            Signaler un problème
          </Link>
        </div>
      )}
    </nav>
  )
}

export default Navbar

