import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Map, Vote, CheckSquare, Bell, LogOut,
  Menu, X, Plus, CheckCircle2, Clock, AlertTriangle,
  Megaphone, Check, Trash2, List, FileText, Sun, Moon
} from 'lucide-react'
import Logo from '../Logo'
import ChatbotWidget from './ChatbotWidget'
import { useSocket } from '../../hooks/useSocket'
import LanguageSwitcher from '../shared/LanguageSwitcher'
import { useTranslation } from 'react-i18next'

const NAV = [
  { labelKey: 'nav.home',         icon: LayoutDashboard, to: '/dashboard'       },
  { labelKey: 'nav.reports',      icon: List,            to: '/mes-signalements'},
  { labelKey: 'nav.proposals',    icon: Vote,            to: '/propositions'    },
  { labelKey: 'nav.map',          icon: Map,             to: '/map'             },
  { labelKey: 'nav.works',        icon: FileText,        to: '/travaux-realises'},
]

// ─── Mock notifications ───────────────────────────────────────────────────────
const INIT_NOTIFS = [
  {
    id: '1', type: 'resolue', read: false,
    title: 'Signalement résolu ✅',
    body: 'Votre signalement "Éclairage défectueux - Av. de la République" a été résolu avec succès.',
    time: '5 min',
  },
  {
    id: '2', type: 'en_cours', read: false,
    title: 'Intervention en cours 🔧',
    body: 'Un agent municipal a été assigné à votre signalement "Nid de poule Av. Bourguiba".',
    time: '2 h',
  },
  {
    id: '3', type: 'proposition', read: true,
    title: 'Nouvelle proposition 🏛️',
    body: 'Le président a soumis un nouveau projet : "Végétalisation de la Place des Martyrs". Votez maintenant !',
    time: '1 j',
  },
  {
    id: '4', type: 'refusee', read: true,
    title: 'Signalement refusé ❌',
    body: 'Votre signalement "Panneau stop cassé" a été refusé. Raison : hors du périmètre municipal.',
    time: '3 j',
  },
  {
    id: '5', type: 'systeme', read: true,
    title: 'Bienvenue sur FixMaCity',
    body: 'Votre compte citoyen est prêt. Commencez par faire votre premier signalement.',
    time: '5 j',
  },
]

const TYPE_ICON: Record<string, { icon: React.ElementType; iconClass: string; bgClass: string }> = {
  resolue:     { icon: CheckCircle2,  iconClass: 'text-green-600 dark:text-green-400', bgClass: 'bg-green-50 dark:bg-green-950/35' },
  en_cours:    { icon: Clock,         iconClass: 'text-[#1557FF] dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-950/35' },
  proposition: { icon: Megaphone,     iconClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-50 dark:bg-purple-950/35' },
  refusee:     { icon: AlertTriangle, iconClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-50 dark:bg-rose-950/35' },
  systeme:     { icon: Bell,          iconClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-950/35' },
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

// ─── Notification Bell component ──────────────────────────────────────────────
function NotificationBell() {
  const [showPanel, setShowPanel]   = useState(false)
  const [notifs, setNotifs]         = useState<any[]>([])
  const [selected, setSelected]     = useState<any>(null)
  const [loading, setLoading]       = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem('fmc_token')

  // ── Fetch real notifications from API ───────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const arr = Array.isArray(data) ? data : data.notifications || []
        if (arr.length > 0) {
          setNotifs(arr.map((n: any) => ({
            id: String(n.id),
            // display_type comes from the enriched backend response
            type: n.display_type || n.type || 'systeme',
            read: n.is_read ?? n.read ?? false,
            title: n.title || n.subject || 'Notification',
            body: n.message || n.body || n.content || '',
            time: n.created_at
              ? (() => {
                  const diff = Math.floor((Date.now() - new Date(n.created_at).getTime()) / 60000)
                  if (diff < 1) return 'À l\'instant'
                  if (diff < 60) return `${diff} min`
                  if (diff < 1440) return `${Math.floor(diff / 60)} h`
                  return `${Math.floor(diff / 1440)} j`
                })()
              : '',
            referenceId: n.reference_id,
            declarationTitle: n.declaration_title,
            raw: n,
          })))
          return
        }
      }
    } catch (_) {}
    // fallback to mock when API unavailable or no notifications yet
    setNotifs(INIT_NOTIFS)
    setLoading(false)
  }, [token])


  useEffect(() => { fetchNotifs().finally(() => setLoading(false)) }, [fetchNotifs])

  const handleNotif = useCallback((data: any) => {
    setNotifs(ns => [
      {
        id: Date.now().toString(),
        type: data?.type || 'systeme',
        read: false,
        title: data?.title || 'Nouvelle notification',
        body: data?.message || 'Vous avez reçu une nouvelle notification.',
        time: 'À l\'instant',
        raw: data,
      },
      ...ns
    ])
  }, [])

  useSocket(handleNotif)

  const unread = notifs.filter(n => !n.read).length

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false)
        setSelected(null)
      }
    }
    if (showPanel) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPanel])

  const markRead = async (id: string) => {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (_) {}
  }

  const markAllRead = async () => {
    setNotifs(ns => ns.map(n => ({ ...n, read: true })))
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (_) {}
  }

  const dismiss = async (id: string) => {
    setNotifs(ns => ns.filter(n => n.id !== id))
    if (selected?.id === id) setSelected(null)
    try {
      await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (_) {}
  }

  const handleSelect = (n: any) => {
    if (!n.read) markRead(n.id)
    setSelected(n)
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        id="notification-bell"
        onClick={() => { setShowPanel(v => !v); setSelected(null) }}
        className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-black px-0.5 animate-pulse">
            {unread}
          </span>
        )}
      </button>

      {/* Drop-down panel */}
      {showPanel && (
        <div
          id="notification-panel"
          className="absolute right-0 top-[calc(100%+8px)] w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          style={{ zIndex: 9999 }}
        >
          {/* ── DETAIL VIEW ── */}
          {selected ? (
            <div className="flex flex-col">
              {/* Detail header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors flex-shrink-0"
                  title="Retour"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                </button>
                <h3 className="font-bold text-[#0A1628] dark:text-white text-sm flex-1">Détail de la notification</h3>
                <button
                  onClick={() => { dismiss(selected.id); setSelected(null) }}
                  className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-all"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Detail body */}
              <div className="p-5">
                {(() => {
                  const cfg = TYPE_ICON[selected.type] || TYPE_ICON['systeme']
                  const Icon = cfg.icon
                  return (
                    <>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${cfg.bgClass}`}>
                        <Icon className={`w-6 h-6 ${cfg.iconClass}`} />
                      </div>
                      <h4 className="text-base font-bold text-[#0A1628] dark:text-white mb-2 leading-snug">
                        {selected.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                        {selected.body || 'Aucun détail disponible pour cette notification.'}
                      </p>
                      {selected.time && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {selected.time.includes('j') || selected.time.includes('h') || selected.time.includes('min')
                            ? `Il y a ${selected.time}`
                            : selected.time}
                        </p>
                      )}
                      {/* Action button depending on type */}
                      {selected.type === 'proposition' && (
                        <a href="/propositions"
                          className="mt-4 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
                          onClick={() => setShowPanel(false)}
                        >
                          <Megaphone className="w-4 h-4" /> Voir les propositions
                        </a>
                      )}
                      {(selected.type === 'resolue' || selected.type === 'en_cours' || selected.type === 'refusee') && (
                        <a href="/mes-signalements"
                          className="mt-4 inline-flex items-center gap-2 bg-[#1557FF] hover:bg-[#1040CC] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
                          onClick={() => setShowPanel(false)}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Voir mes signalements
                        </a>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          ) : (
            /* ── LIST VIEW ── */
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-[#0A1628] dark:text-white text-base">Notifications</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {loading ? 'Chargement…' : unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour'}
                  </p>
                </div>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#1557FF] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <Check className="w-3.5 h-3.5" /> Tout lire
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                {notifs.length === 0 ? (
                  <div className="py-14 text-center">
                    <Bell className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Aucune notification</p>
                    <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Vous serez notifié ici de toute activité</p>
                  </div>
                ) : (
                  notifs.map(n => {
                    const cfg  = TYPE_ICON[n.type] || TYPE_ICON['systeme']
                    const Icon = cfg.icon
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleSelect(n)}
                        className={`flex items-start gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer ${!n.read ? 'bg-blue-50/40 dark:bg-blue-950/15' : ''}`}
                      >
                        {/* Type icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bgClass}`}>
                          <Icon className={`w-4 h-4 ${cfg.iconClass}`} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={`text-sm font-bold truncate ${!n.read ? 'text-[#0A1628] dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="w-2 h-2 bg-[#1557FF] rounded-full flex-shrink-0 animate-ping" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{n.body}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                              {n.time.startsWith('À') ? n.time : `Il y a ${n.time}`}
                            </p>
                            <span className="text-[10px] text-[#1557FF] dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                              Voir les détails →
                            </span>
                          </div>
                        </div>

                        {/* Dismiss × */}
                        <button
                          onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                          className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              {notifs.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                  <button
                    onClick={() => setNotifs([])}
                    className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors"
                  >
                    Effacer toutes les notifications
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────
interface CitizenLayoutProps { children: React.ReactNode }

const CitizenLayout: React.FC<CitizenLayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('fmc_theme') === 'dark')
  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')
  const { t } = useTranslation()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('fmc_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('fmc_theme', 'light')
    }
    window.dispatchEvent(new Event('fmc_theme_change'))
  }, [darkMode])

  const handleLogout = () => {
    localStorage.removeItem('fmc_token')
    localStorage.removeItem('fmc_user')
    navigate('/login')
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col ${darkMode ? 'dark bg-slate-950' : 'bg-[#f7f9fb]'}`}>

      {/* ── Top bar ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 border-b h-16 flex items-center px-4 sm:px-6 gap-4 shadow-sm transition-all duration-300 ${
        darkMode ? 'bg-slate-900/60 border-slate-800/50 backdrop-blur-xl' : 'bg-white border-slate-100'
      }`}>

        <Logo to="/dashboard" variant={darkMode ? "light" : "dark"} size="sm" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV.map(item => {
            const active = location.pathname === item.to
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  active 
                    ? 'bg-[#1557FF] text-white shadow-lg shadow-blue-500/20' 
                    : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <item.icon className="w-4 h-4" />
                {t(item.labelKey)}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* New report CTA */}
          <Link to="/nouveau-signalement"
            className="hidden md:flex items-center gap-2 bg-[#1557FF] hover:bg-[#1040CC] text-white font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95">
            <Plus className="w-4 h-4" /> Signaler
          </Link>

          {/* Theme Toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-xl border flex items-center justify-center transition-all shadow-sm ${
              darkMode ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-white border-slate-100 text-slate-400 hover:text-blue-500 hover:border-blue-100'
            }`}>
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language Switcher */}
          <LanguageSwitcher dark={darkMode} />

          {/* Notifications */}
          <NotificationBell />

          {/* Avatar → profile page */}
          <Link to="/profile" className={`flex items-center gap-2 pl-2 border-l group ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="w-8 h-8 rounded-full bg-[#1557FF] flex items-center justify-center text-white text-xs font-bold group-hover:ring-2 group-hover:ring-[#1557FF]/40 transition-all shadow-md">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div className="hidden sm:block">
              <p className={`text-sm font-semibold leading-none ${darkMode ? 'text-white' : 'text-[#0A1628]'}`}>{user.first_name} {user.last_name}</p>
              <p className="text-xs text-[#1557FF] mt-0.5 font-medium">Mon profil</p>
            </div>
          </Link>

          {/* Logout */}
          <button onClick={handleLogout}
            className={`p-2 rounded-xl transition-all ${
              darkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
            }`}
            title="Se déconnecter">
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile hamburger */}
          <button className={`md:hidden p-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <div className={`absolute top-16 left-0 bottom-0 w-64 shadow-xl p-4 transition-all duration-300 ${
            darkMode ? 'bg-slate-900 border-r border-slate-800' : 'bg-white'
          }`}
            onClick={e => e.stopPropagation()}>
            {NAV.map(item => {
              const active = location.pathname === item.to
              return (
                <Link key={item.to} to={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold mb-1 transition-all ${
                    active 
                      ? 'bg-[#1557FF] text-white' 
                      : darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                  <item.icon className="w-4 h-4" />
                  {t(item.labelKey)}
                </Link>
              )
            })}
            <Link to="/nouveau-signalement" onClick={() => setOpen(false)}
              className="flex items-center gap-2 mt-3 bg-[#1557FF] text-white font-bold px-4 py-3 rounded-xl text-sm shadow-lg shadow-blue-500/20">
              <Plus className="w-4 h-4" /> Nouveau signalement
            </Link>
          </div>
        </div>
      )}

      <main className="pt-16 flex-1">{children}</main>
      <ChatbotWidget />
    </div>
  )
}

export default CitizenLayout
