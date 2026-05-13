import React, { useState, useEffect } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import { Bell, Check, CheckCheck, Trash2, Filter, AlertTriangle, UserPlus, FileText, ThumbsUp, Settings, X } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const token = () => localStorage.getItem('fmc_token')

const NOTIF_TYPES: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  URGENT_DECLARATION: { icon: <AlertTriangle className="w-4 h-4"/>, color: '#EF4444', bg: '#FEF2F2' },
  NEW_DECLARATION:    { icon: <FileText className="w-4 h-4"/>,     color: '#1557FF', bg: '#EEF2FF' },
  STATUS_CHANGE:      { icon: <Bell className="w-4 h-4"/>,         color: '#F59E0B', bg: '#FFFBEB' },
  ASSIGNED_CHEF:      { icon: <UserPlus className="w-4 h-4"/>,     color: '#10B981', bg: '#F0FDF4' },
  DECLARATION_REJECTED: { icon: <AlertTriangle className="w-4 h-4"/>, color: '#EF4444', bg: '#FEF2F2' },
  PROPOSITION_VOTE:   { icon: <ThumbsUp className="w-4 h-4"/>,    color: '#8B5CF6', bg: '#F5F3FF' },
  SYSTEM:             { icon: <Settings className="w-4 h-4"/>,     color: '#64748B', bg: '#F8FAFC' },
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 60) return `il y a ${m} min`
  if (h < 24) return `il y a ${h}h`
  return `il y a ${d}j`
}

const PresidentNotifications: React.FC = () => {
  const [notifs, setNotifs]   = useState<any[]>([])
  const [filter, setFilter]   = useState('all')
  const [typeF,  setTypeF]    = useState('Tous')
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/notifications?limit=50`, {
          headers: { Authorization: `Bearer ${token()}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.notifications?.length) setNotifs(data.notifications)
        }
      } catch (_) {}
    }
    load()
  }, [])

  const markRead = async (id: string) => {
    try {
      await fetch(`${API}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` }
      })
    } catch (_) {}
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    try {
      await fetch(`${API}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` }
      })
    } catch (_) {}
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const deleteNotif = (id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id))
    setSelected(prev => prev.filter(s => s !== id))
  }

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const deleteSelected = () => {
    setNotifs(prev => prev.filter(n => !selected.includes(n.id)))
    setSelected([])
  }

  const filtered = notifs.filter(n => {
    if (filter === 'unread' && n.is_read) return false
    if (filter === 'read'   && !n.is_read) return false
    if (typeF !== 'Tous' && n.type !== typeF) return false
    return true
  }).sort((a, b) => {
    const isUrgentA = a.type === 'URGENT_DECLARATION' || a.priority === 'haute' || a.title.toLowerCase().includes('urgent') || a.title.toLowerCase().includes('crucial');
    const isUrgentB = b.type === 'URGENT_DECLARATION' || b.priority === 'haute' || b.title.toLowerCase().includes('urgent') || b.title.toLowerCase().includes('crucial');
    if (isUrgentA && !isUrgentB) return -1;
    if (!isUrgentA && isUrgentB) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })

  const unreadCount = notifs.filter(n => !n.is_read).length

  return (
    <PresidentLayout title="Notifications">
      <div className="max-w-4xl mx-auto">

        {/* Header stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Non lues',    value: unreadCount,                      color: '#EF4444', bg: '#FEF2F2', icon: '🔴' },
            { label: 'Aujourd\'hui', value: notifs.filter(n => new Date(n.created_at).toDateString() === new Date().toDateString()).length, color: '#1557FF', bg: '#EEF2FF', icon: '📅' },
            { label: 'Total',       value: notifs.length,                    color: '#10B981', bg: '#F0FDF4', icon: '📬' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: k.bg }}>
                {k.icon}
              </div>
              <div>
                <p className="text-2xl font-black text-[#0A1628]">{k.value}</p>
                <p className="text-xs font-bold text-slate-400">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              {/* Filter tabs */}
              {[
                { key: 'all',    label: `Toutes (${notifs.length})` },
                { key: 'unread', label: `Non lues (${unreadCount})` },
                { key: 'read',   label: 'Lues' },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    filter === f.key
                      ? 'text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  style={filter === f.key ? { background: '#1557FF' } : {}}>
                  {f.label}
                </button>
              ))}

              {/* Type filter */}
              <select value={typeF} onChange={e => setTypeF(e.target.value)}
                className="ml-2 text-xs font-bold text-slate-600 bg-slate-100 border-none rounded-full px-3 py-1.5 outline-none cursor-pointer">
                <option>Tous</option>
                <option value="NEW_DECLARATION">Nouvelles déclarations</option>
                <option value="URGENT_DECLARATION">Cas urgents</option>
                <option value="DECLARATION_REJECTED">Refus</option>
                <option value="STATUS_CHANGE">Changements statut</option>
                <option value="PROPOSITION_VOTE">Propositions</option>
                <option value="SYSTEM">Système</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {selected.length > 0 && (
                <button onClick={deleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5"/> Supprimer ({selected.length})
                </button>
              )}
              <button onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">
                <CheckCheck className="w-3.5 h-3.5"/> Tout marquer lu
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-4xl mb-3">🔔</p>
                <p className="font-bold text-slate-500">Aucune notification</p>
                <p className="text-sm text-slate-400">Vous êtes à jour !</p>
              </div>
            )}
            {filtered.map(n => {
              const cfg = NOTIF_TYPES[n.type] || NOTIF_TYPES['SYSTEM']
              const isSelected = selected.includes(n.id)
              return (
                <div key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-all cursor-pointer group ${
                    !n.is_read ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                  } ${isSelected ? 'bg-blue-50' : ''}`}
                  onClick={() => !n.is_read && markRead(n.id)}>

                  {/* Checkbox */}
                  <div
                    onClick={e => { e.stopPropagation(); toggleSelect(n.id) }}
                    className={`w-4 h-4 rounded border-2 mt-1 flex-shrink-0 flex items-center justify-center cursor-pointer transition-all ${
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 group-hover:border-slate-400'
                    }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white"/>}
                  </div>

                  {/* Unread dot */}
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 transition-all ${
                    !n.is_read ? 'bg-blue-600' : 'bg-transparent'
                  }`}/>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm flex items-center flex-wrap gap-2 ${!n.is_read ? 'font-bold text-[#0A1628]' : 'font-semibold text-slate-700'}`}>
                        {n.title}
                        {(n.type === 'URGENT_DECLARATION' || n.priority === 'haute' || n.title.toLowerCase().includes('urgent') || n.title.toLowerCase().includes('crucial')) && (
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-red-500 text-white shadow-sm inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3"/> Urgent
                          </span>
                        )}
                      </p>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={e => { e.stopPropagation(); markRead(n.id) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"
                        title="Marquer comme lu">
                        <Check className="w-3.5 h-3.5"/>
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-100 hover:text-red-500 transition-all"
                      title="Supprimer">
                      <X className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </PresidentLayout>
  )
}

export default PresidentNotifications
