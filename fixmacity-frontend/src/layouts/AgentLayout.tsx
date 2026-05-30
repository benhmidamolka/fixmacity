// src/layouts/AgentLayout.tsx
import React, { useState, useCallback, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Kanban, Bell,
  Settings, LogOut, Menu, X, HelpCircle,
  ChevronDown, Search, Sun, Moon, Archive
} from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import LanguageSwitcher from '../components/shared/LanguageSwitcher'
import Logo from '../components/Logo'

const NAV = [
  {
    section: 'Menu',
    items: [
      { label: 'Mes Missions',     icon: ClipboardList,   to: '/agent/declarations'   },
      { label: 'Tableau',          icon: Kanban,          to: '/agent/board'          },
      { label: 'Archives',         icon: Archive,         to: '/agent/archives'       },
      { label: 'Notifications',    icon: Bell,            to: '/agent/notifications', badge: null },
    ]
  }
]

interface Props { children: React.ReactNode; title?: string }

const AgentLayout: React.FC<Props> = ({ children, title = 'Tableau de bord' }) => {
  const location   = useLocation()
  const navigate   = useNavigate()
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const isMissionsPage = location.pathname === '/agent/declarations'
  const [darkMode, setDarkMode] = useState(() => {
    if (localStorage.getItem('fmc_theme') === 'dark' || window.location.pathname === '/agent/declarations') return true
    return false
  })

  useEffect(() => {
    if (isMissionsPage) {
      setDarkMode(true)
    }
  }, [isMissionsPage])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('fmc_theme', 'dark')
    } else {
      if (!isMissionsPage) {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('fmc_theme', 'light')
      }
    }
  }, [darkMode, isMissionsPage])

  const handleNotif = useCallback(() => setUnreadCount(n => (n ?? 0) + 1), [])
  useSocket(handleNotif)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
        })
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.count ?? data.unread_count ?? null)
        }
      } catch (_) {}
    }
    fetchUnread()
  }, [])

  const user     = JSON.parse(localStorage.getItem('fmc_user') || '{}')
  const initials = `${user.first_name?.[0] ?? 'A'}${user.last_name?.[0] ?? 'T'}`

  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
      })
    } catch (_) {}
    localStorage.removeItem('fmc_token')
    localStorage.removeItem('fmc_user')
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className={`flex flex-col h-full transition-all duration-300 ${isCollapsed ? 'items-center' : ''}`}>

      {/* ── BRAND LOGO (iBanKo-style) ── */}
      <div className={`px-5 pt-6 pb-5 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
        <Logo size={isCollapsed ? 'xs' : 'md'} iconOnly={isCollapsed} variant={darkMode ? 'light' : 'dark'} to="/" />
      </div>

      {/* Divider */}
      <div className={`mx-5 mb-4 h-px ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />

      {/* Mac Controls */}
      <div className={`px-5 pb-3 flex items-center gap-1.5 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      </div>

      {/* Profile */}
      <div className={`px-5 py-4 mb-2 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="relative flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black ring-2 ${darkMode ? 'ring-slate-800' : 'ring-white/50'} shadow-sm`}
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
            {initials}
          </div>
          <div className={`absolute -top-1 -right-1 w-4 h-4 ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-full flex items-center justify-center shadow-sm`}>
            <span className="text-[8px]">🛠️</span>
          </div>
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-0.5">Agent Terrain</p>
            <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-[#0A1628]'} truncate`}>{user.first_name} {user.last_name?.[0]}.</p>
          </div>
        )}
        {!isCollapsed && (
          <button onClick={() => setIsCollapsed(true)}
            className={`ml-auto p-1.5 rounded-lg ${darkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-300 hover:bg-slate-100/50'} transition-all`}>
            <Menu className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>

      {/* Dept badge */}
      {!isCollapsed && (
        <div className={`mx-4 mb-4 px-3 py-2 rounded-xl ${darkMode ? 'bg-emerald-900/20 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'} border`}>
          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Département</p>
          <p className={`text-xs font-black ${darkMode ? 'text-emerald-300' : 'text-emerald-700'} mt-0.5`}>
            {user.department_name || 'Voirie & Routes'}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-2">
        {NAV.map(group => (
          <div key={group.section} className="mb-6">
            {!isCollapsed && (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400/80 px-2 mb-3">
                {group.section}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(item => {
                const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                return (
                  <Link key={item.to} to={item.to}
                    onClick={() => setMobileOpen(false)}
                    title={isCollapsed ? item.label : ''}
                    className={`group flex items-center gap-3 rounded-2xl transition-all duration-200 ${
                      isCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2.5 w-full'
                    } ${
                      active
                        ? 'text-white shadow-lg'
                        : darkMode ? 'text-slate-400 hover:bg-slate-800/60' : 'text-slate-500 hover:bg-white/60'
                    }`}
                    style={active ? { background: 'linear-gradient(135deg, #10B981, #059669)' } : {}}>
                    <item.icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0 transition-transform group-hover:scale-110`} />
                    {!isCollapsed && (
                      <span className="text-sm font-bold tracking-tight flex-1 truncate">{item.label}</span>
                    )}
                    {!isCollapsed && item.to === '/agent/notifications' && !active && (unreadCount ?? 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`px-4 py-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100/50'} flex flex-col items-center gap-4`}>
        {!isCollapsed && (
          <div className={`flex items-center gap-6 ${darkMode ? 'text-slate-500' : 'text-slate-300'}`}>
            <Link to="/agent/settings" className="hover:text-emerald-500 transition-colors">
              <Settings className="w-5 h-5" />
            </Link>
            <button className="hover:text-slate-550 transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={logout} className="hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
        {isCollapsed && (
          <button onClick={() => setIsCollapsed(false)}
            className={`p-2 rounded-xl ${darkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-300 hover:bg-emerald-50'} transition-all`}>
            <ChevronDown className="w-5 h-5 rotate-90" />
          </button>
        )}
      </div>
    </div>
  )

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-[260px]'
  const mainMargin   = isCollapsed ? 'md:ml-20' : 'md:ml-[260px]'

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${darkMode ? 'dark bg-slate-950' : 'bg-[#F8F9FD]'}`}>
      {/* Sidebar desktop */}
      <aside className={`hidden md:flex flex-col ${sidebarWidth} flex-shrink-0 fixed top-4 left-4 bottom-4 transition-all duration-300 z-40`}>
        <div className={`flex-1 ${darkMode ? 'bg-slate-900/60 border-slate-800/50 shadow-2xl shadow-black/20' : 'bg-white/80 border-white shadow-2xl shadow-slate-200/50'} backdrop-blur-xl border rounded-[2.5rem] overflow-hidden`}>
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-4 left-4 bottom-4 w-64 z-50">
            <div className={`h-full ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white'} rounded-[2.5rem] shadow-2xl overflow-hidden border`}>
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className={`flex-1 ${mainMargin} flex flex-col min-h-screen transition-all duration-300`}>
        {/* Topbar */}
        <header className={`fixed top-0 right-0 left-0 ${mainMargin} h-20 ${darkMode ? 'bg-slate-950/60 border-b border-slate-800/50' : 'bg-[#F8F9FD]/80 border-b border-slate-100'} backdrop-blur-md z-30 flex items-center gap-4 px-8 transition-all duration-300`}>
          <button className={`md:hidden p-2 ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-white'} rounded-xl shadow-sm`}
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex-1">
            <p className={`text-[10px] font-black ${darkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest leading-none mb-1`}>
              FixMaCity · {user.department_name || 'Voirie & Routes'}
            </p>
            <h1 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-[#0A1628]'} leading-tight`}>{title}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className={`hidden lg:flex items-center gap-3 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'} border rounded-2xl px-4 py-2.5 w-64 focus-within:ring-2 focus-within:ring-emerald-100 transition-all`}>
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Rechercher une mission..."
                className={`bg-transparent text-sm font-bold ${darkMode ? 'text-slate-200 placeholder-slate-500' : 'text-slate-655 placeholder-slate-300'} outline-none w-full`} />
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all shadow-sm ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-white border-slate-100 text-slate-400 hover:text-emerald-500 hover:border-emerald-100'
                }`}>
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <LanguageSwitcher dark={darkMode} />
              <Link to="/agent/notifications"
                className={`relative w-11 h-11 rounded-2xl border flex items-center justify-center transition-all shadow-sm ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-100 text-slate-400 hover:text-emerald-500 hover:border-emerald-100'
                }`}>
                <Bell className="w-5 h-5" />
                {(unreadCount ?? 0) > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />}
              </Link>
            </div>

            <div className={`flex items-center gap-3 pl-4 border-l ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-[#0A1628]'} leading-none`}>{user.first_name} {user.last_name?.[0]}.</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color:'#10B981' }}>
                  Agent Terrain
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-lg"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="pt-24 flex-1 p-8">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default AgentLayout