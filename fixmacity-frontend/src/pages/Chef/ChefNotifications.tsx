// src/pages/Chef/ChefNotifications.tsx
import React, { useState, useEffect } from 'react'
import { Bell, ShieldAlert, CheckCircle, Info, Trash2, CheckSquare, Clock, ArrowRight } from 'lucide-react'
import ChefLayout from '../../layouts/ChefLayout'
import { Link, useNavigate } from 'react-router-dom'

interface Notif {
  id: string
  type: string
  title: string
  body?: string
  message?: string
  reference_id?: string
  created_at: string
  is_read: boolean
  data?: {
    declaration_id?: string
    priority?: string
  }
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return "À l'instant"
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  return `${d}j`
}

const ChefNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notif[]>([])

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAllRead = async () => {
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('fmc_token')}` }
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error(err)
    }
  }

  const getTypeStyles = (type: string) => {
    switch(type) {
      case 'assignment': return { icon: ShieldAlert, color: '#6366F1', bg: 'white' }
      case 'resolution': return { icon: CheckCircle, color: '#10B981', bg: 'white' }
      case 'urgent':     return { icon: Info,       color: '#EF4444', bg: 'white' }
      default:           return { icon: Bell,       color: '#6366F1', bg: 'white' }
    }
  }

  const [activeTab, setActiveTab] = useState('today')

  return (
    <ChefLayout title="Notifications">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden backdrop-blur-md">
          
          {/* Header */}
          <div className="p-8 flex items-center justify-between pb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Centre de Notifications</h2>
            <button className="px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all">
              Voir Tout
            </button>
          </div>

          {/* Tabs */}
          <div className="px-8 mb-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] flex gap-1">
              {['today', 'this_week', 'earlier'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === tab ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {tab === 'today' ? 'Aujourd\'hui' : tab === 'this_week' ? 'Cette semaine' : 'Plus ancien'}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-50">
            {notifications.length > 0 ? notifications.map(n => {
              const style = getTypeStyles(n.type)
              const Icon = style.icon
              const priority = n.data?.priority
              const displayMessage = n.body || n.message

              const content = (
                <div className={`p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all flex items-start gap-6 relative group ${!n.is_read ? 'bg-indigo-50/5' : ''}`}>
                  <div className="w-12 h-12 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 shrink-0 shadow-sm group-hover:border-indigo-200 dark:group-hover:border-indigo-500/50 transition-colors">
                    <Icon className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug group-hover:text-[#1557FF] dark:group-hover:text-blue-400 transition-colors">{n.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">{displayMessage}</p>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-2">
                        {priority && (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${priority === 'haute' ? 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'}`}>
                            {priority === 'haute' ? 'Crucial' : priority}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      
                      {n.data?.declaration_id && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest group-hover:translate-x-1 transition-all">
                          Gérer l'affectation <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )

              return (
                <div key={n.id} onClick={() => {
                  if (!n.is_read) markAsRead(n.id)
                }}>
                  {n.data?.declaration_id ? (
                    <Link to={`/chef/declarations/${n.data?.declaration_id}`} className="block border-none">
                      {content}
                    </Link>
                  ) : (
                    <div className="cursor-default">{content}</div>
                  )}
                </div>
              )
            }) : (
              <div className="p-20 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200 dark:border-slate-700">
                  <Bell className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                </div>
                <p className="text-sm font-bold text-slate-400 dark:text-slate-600">Aucune notification pour le moment</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChefLayout>
  )
}

export default ChefNotifications
