import React, { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Map, Users, Building2,
  Vote, Bell, Settings, LogOut, Menu, X, Mail, HelpCircle,
  ChevronDown, Plus, Search, Inbox, GitMerge, Sun, Moon
} from 'lucide-react'
import CreateActionModal from '../components/president/CreateActionModal'
import { useSocket } from '../hooks/useSocket'

const NAV = [
  {
    section: 'Menu',
    items: [
      { label: 'Dashboard',        icon: LayoutDashboard, to: '/president/dashboard'     },
      { label: 'Déclarations',     icon: FileText,        to: '/president/declarations'  },
      { label: 'Personnel',        icon: Users,           to: '/president/personnel'      },
      { label: 'Services',         icon: Building2,       to: '/president/services'       },
      { label: 'Propositions',     icon: Vote,            to: '/president/propositions'   },
      { label: 'Notifications',    icon: Bell,            to: '/president/notifications', badge: null },
    ]
  }
]

interface Props { children: React.ReactNode; title?: string }

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const PresidentLayout: React.FC<Props> = ({ children, title = 'Dashboard' }) => {
  const location = useLocation()
  const navigate  = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('fmc_theme') === 'dark')

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('fmc_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('fmc_theme', 'light')
    }
  }, [darkMode])

  const handleNotif = useCallback(() => setUnreadCount(n => (n ?? 0) + 1), [])
  useSocket(handleNotif)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_URL}/notifications/unread-count`, {
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

  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')
  const initials = `${user.first_name?.[0] ?? 'M'}${user.last_name?.[0] ?? 'A'}`

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
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
      {/* Mac Controls */}
      <div className={`px-5 pt-5 pb-3 flex items-center gap-1.5 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      </div>

      {/* Profile */}
      <div className={`px-5 py-4 mb-2 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="relative flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black ring-2 ${darkMode ? 'ring-slate-800' : 'ring-white/50'} shadow-sm`}
            style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' }}>
            {initials}
          </div>
          <div className={`absolute -top-1 -right-1 w-4 h-4 ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-full flex items-center justify-center shadow-sm`}>
            <span className="text-[8px]">👋</span>
          </div>
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-0.5">Good Day ✨</p>
            <p className={`text-sm font-black ${darkMode ? 'text-white' : '#0A1628'} truncate`}>{user.first_name} {user.last_name[0]}.</p>
          </div>
        )}
        {!isCollapsed && (
          <button onClick={() => setIsCollapsed(true)} className={`ml-auto p-1.5 rounded-lg ${darkMode ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-300 hover:bg-slate-100/50'} transition-all`}>
            <Menu className="w-4 h-4 rotate-180" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar">
        {NAV.map(group => (
          <div key={group.section} className="mb-6">
            {!isCollapsed && (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400/80 px-2 mb-3 flex items-center justify-between">
                <span>{group.section}: {group.items.length}</span>
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(item => {
                const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                return (
                  <Link key={item.to} to={item.to}
                    onClick={() => setMobileOpen(false)}
                    title={isCollapsed ? item.label : ''}
                    className={`group flex items-center gap-3 rounded-xl transition-all duration-300 ${
                      isCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2.5 w-full'
                    } ${
                      active 
                        ? (darkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-[#1557FF] text-white shadow-lg shadow-blue-200') 
                        : (darkMode ? 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent' : 'text-slate-500 hover:bg-slate-50 border border-transparent')
                    }`}>
                    <item.icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0 transition-transform group-hover:scale-110`} />
                    {!isCollapsed && <span className="text-sm font-bold tracking-tight flex-1 truncate">{item.label}</span>}
                    {!isCollapsed && item.to === '/president/notifications' && !active && (unreadCount ?? 0) > 0 && (
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

      {/* Footer / Settings & Create */}
      <div className={`px-4 py-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100/50'} flex flex-col items-center gap-6`}>
        {!isCollapsed && (
          <div className={`flex items-center gap-6 ${darkMode ? 'text-slate-500' : 'text-slate-300'}`}>
            <Link to="/president/settings" className="hover:text-[#1557FF] transition-colors">
              <Settings className="w-5 h-5" />
            </Link>
            <button className="hover:text-slate-500 transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className="hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
        
        <button 
          onClick={() => setIsActionModalOpen(true)}
          className={`${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-[#1557FF] flex items-center justify-center text-white shadow-xl shadow-blue-200 hover:scale-110 active:scale-95 transition-all`}>
          <Plus className={isCollapsed ? 'w-5 h-5' : 'w-6 h-6'} />
        </button>

        {isCollapsed && (
          <button onClick={() => setIsCollapsed(false)} className="mt-2 p-2 rounded-xl text-slate-300 hover:text-[#1557FF] hover:bg-blue-50 transition-all">
            <ChevronDown className="w-5 h-5 rotate-90" />
          </button>
        )}
      </div>
    </div>
  )

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-[260px]'
  const mainMargin  = isCollapsed ? 'md:ml-20' : 'md:ml-[260px]'

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${darkMode ? 'dark bg-slate-950' : 'bg-[#F9FAFB]'}`}>

      {/* Sidebar desktop */}
      <aside className={`hidden md:flex flex-col ${sidebarWidth} flex-shrink-0 fixed top-0 left-0 bottom-0 ${darkMode ? 'bg-slate-900/60 border-slate-800/50 shadow-2xl shadow-black/20' : 'bg-white border-slate-100 shadow-sm'} border-r transition-all duration-300 z-40 backdrop-blur-2xl`}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-4 left-4 bottom-4 w-64 transition-all duration-300 z-50">
            <div className={`h-full ${darkMode ? 'bg-slate-900/80' : 'bg-white'} rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl`}>
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className={`flex-1 ${mainMargin} flex flex-col min-h-screen transition-all duration-300`}>

        {/* Topbar */}
        <header className={`fixed top-0 right-0 left-0 ${mainMargin} h-20 ${darkMode ? 'bg-slate-950/60 border-b border-slate-800/50' : 'bg-[#F9FAFB]/80 border-b border-slate-100'} backdrop-blur-2xl z-30 flex items-center gap-4 px-8 transition-all duration-300`}>
          <button className="md:hidden p-2 text-slate-500 rounded-xl hover:bg-white shadow-sm"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex-1">
            <p className={`text-[10px] font-black ${darkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest leading-none mb-1`}>
              FixMaCity Administration
            </p>
            <h1 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-[#0A1628]'} leading-tight`}>{title}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className={`hidden lg:flex items-center gap-3 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'} border rounded-full px-4 py-2.5 w-64 shadow-sm focus-within:ring-2 focus-within:ring-blue-100/50 transition-all`}>
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Rechercher une donnée..."
                className={`bg-transparent text-sm font-bold ${darkMode ? 'text-slate-200 placeholder-slate-500' : 'text-slate-600 placeholder-slate-300'} outline-none w-full`} />
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all shadow-sm ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-white border-slate-100 text-slate-400 hover:text-blue-500 hover:border-blue-100'
                }`}>
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button className={`relative w-11 h-11 rounded-full border flex items-center justify-center transition-all shadow-sm ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-100 text-slate-400 hover:text-[#1557FF] hover:border-blue-100'
              }`}>
                <Bell className="w-5 h-5" />
                {(unreadCount ?? 0) > 0 && <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />}
              </button>
              <button className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all shadow-sm ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-100 text-slate-400 hover:text-[#1557FF] hover:border-blue-100'
              }`}>
                <Mail className="w-5 h-5" />
              </button>
            </div>

            <div className={`flex items-center gap-3 pl-4 border-l ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-[#0A1628]'} leading-none`}>
                  {user.first_name} {user.last_name[0]}.
                </p>
                <p className="text-[10px] font-bold text-[#1557FF] uppercase tracking-widest mt-1">Maire de la ville</p>
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-lg shadow-blue-100"
                style={{ background: 'linear-gradient(135deg, #1557FF 0%, #3B82F6 100%)' }}>
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="pt-24 flex-1 p-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <CreateActionModal 
        isOpen={isActionModalOpen} 
        onClose={() => setIsActionModalOpen(false)} 
      />
    </div>
  )
}

export default PresidentLayout
