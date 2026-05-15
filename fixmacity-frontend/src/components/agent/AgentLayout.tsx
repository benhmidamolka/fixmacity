// src/components/agent/AgentLayout.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Bell, LogOut, Menu,
  Settings, ClipboardList, List
} from 'lucide-react'
import { useSocket } from '../../hooks/useSocket'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const NAV = [
  {
    section: 'Travail',
    items: [
      { label: 'Tableau de bord', icon: LayoutDashboard, to: '/agent/dashboard'     },
      { label: 'Mes Missions',    icon: List,            to: '/agent/declarations'  },
      { label: 'Notifications',   icon: Bell,            to: '/agent/notifications' },
    ]
  },
  {
    section: 'Compte',
    items: [
      { label: 'Paramètres', icon: Settings, to: '/agent/settings' },
    ]
  }
]


interface Props { children: React.ReactNode; title?: string }

const AgentLayout: React.FC<Props> = ({ children, title = 'Dashboard' }) => {
  const location   = useLocation()
  const navigate   = useNavigate()
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [missionCount, setMissionCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)

  const user     = JSON.parse(localStorage.getItem('fmc_user') || '{}')
  const initials = `${user.first_name?.[0] ?? 'A'}${user.last_name?.[0] ?? 'T'}`

  const handleNotif = useCallback(() => setUnreadCount(n => (n ?? 0) + 1), [])
  useSocket(handleNotif)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
        })
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.count ?? data.unread_count ?? null)
        }
      } catch (_) {}
    }
    fetchUnread()
    fetchMissionCount()
    const interval = setInterval(fetchMissionCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchMissionCount = async () => {
    try {
      const res = await fetch(`${API}/agent/declarations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
      })
      const data = await res.json()
      const pending = (data.declarations || []).filter((d: any) => d.status === 'assignee_agent').length
      setMissionCount(pending)
    } catch (e) {}
  }

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
      })
    } catch (e) {}
    localStorage.removeItem('fmc_token')
    localStorage.removeItem('fmc_user')
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-6 py-6 border-b border-slate-100 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div>
            <p className="text-sm font-black text-[#0A1628] leading-none">FixMaCity</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Agent</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {NAV.map(section => (
          <div key={section.section}>
            {!isCollapsed && (
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-3 mb-2">{section.section}</p>
            )}
            <div className="space-y-1">
              {section.items.map(item => {
                const active = location.pathname === item.to
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                      active
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-[#0A1628]'
                    }`}
                  >
                    <item.icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                    {!isCollapsed && <span className="text-sm font-bold">{item.label}</span>}

                    {/* Badge for missions */}
                    {item.label === 'Dashboard' && missionCount > 0 && (
                      <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${
                        active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {missionCount}
                      </span>
                    )}

                    {/* Badge for unread notifications */}
                    {item.label === 'Notifications' && (unreadCount ?? 0) > 0 && (
                      <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${
                        active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                      }`}>
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

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-slate-100">
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[#0A1628] truncate">{user.first_name} {user.last_name}</p>
              <p className="text-[10px] text-slate-400 font-bold">Agent terrain</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-bold">Déconnexion</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-slate-100 shadow-sm transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(v => !v)}
          className="absolute top-6 -right-3 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-500 z-10 shadow-sm"
          style={{ position: 'relative', marginLeft: 'auto', marginRight: '-12px', marginTop: '16px', marginBottom: '-22px' }}
        >
          {isCollapsed ? '›' : '‹'}
        </button>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-50">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-[#0A1628]">{title}</h1>
          </div>
          <button onClick={logout} className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all text-sm font-bold">
            <LogOut className="w-4 h-4" />
            Sortir
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AgentLayout