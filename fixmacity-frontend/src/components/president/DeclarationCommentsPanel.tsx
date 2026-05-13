import React, { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare, Loader2, ChevronDown } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'
const token = () => localStorage.getItem('fmc_token')

export type Channel = 'president_chef' | 'chef_agent' | 'agent_citizen'

interface Comment {
  id: string
  declaration_id: string
  user_id: string
  content: string
  channel: Channel
  created_at: string
  user?: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
}

const CHANNEL_LABELS: Record<Channel, { label: string; color: string; bg: string }> = {
  president_chef: { label: 'Président — Chef de Service', color: '#6366F1', bg: '#EEF2FF' },
  chef_agent:     { label: 'Chef — Agent',                color: '#0EA5E9', bg: '#E0F2FE' },
  agent_citizen:  { label: 'Agent — Citoyen',             color: '#10B981', bg: '#D1FAE5' },
}

const ROLE_LABELS: Record<string, string> = {
  president: 'Président',
  chef:      'Chef de Service',
  agent:     'Agent',
  citizen:   'Citoyen',
}

function initials(u?: Comment['user']) {
  if (!u) return '?'
  return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase()
}

function fullName(u?: Comment['user']) {
  if (!u) return 'Utilisateur'
  return `${u.first_name} ${u.last_name}`
}

interface Props {
  declarationId: string
  visibleChannels: Channel[]
  writableChannels: Channel[]
  role: 'president' | 'chef' | 'agent' | 'citizen'
  currentUserId?: string
}

const DeclarationCommentsPanel: React.FC<Props> = ({
  declarationId,
  visibleChannels,
  writableChannels,
  role,
  currentUserId,
}) => {
  const [activeChannel, setActiveChannel] = useState<Channel>(visibleChannels[0])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')

  const cfg = CHANNEL_LABELS[activeChannel]
  const canWrite = writableChannels.includes(activeChannel)

  const fetchComments = async () => {
    setLoading(true)
    try {
      const endpoint = role === 'citizen' ? 'declarations' : `${role}/declarations`
      const res = await fetch(
        `${API}/${endpoint}/${declarationId}/comments?channel=${activeChannel}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      )
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
      }
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    if (declarationId) fetchComments()
  }, [declarationId, activeChannel])

  const handleSubmit = async () => {
    if (!input.trim() || !canWrite) return
    setSending(true)
    try {
      const endpoint = role === 'citizen' ? 'declarations' : `${role}/declarations`
      const res = await fetch(`${API}/${endpoint}/${declarationId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ content: input.trim(), channel: activeChannel }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, data.comment])
        setInput('')
      }
    } catch (_) {}
    setSending(false)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  return (
    <div className="flex flex-col gap-4">

      {/* Channel selector — only shown if more than one */}
      {visibleChannels.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {visibleChannels.map(ch => {
            const c = CHANNEL_LABELS[ch]
            const active = activeChannel === ch
            return (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  active
                    ? 'text-white border-transparent'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
                style={active ? { background: c.color, borderColor: c.color } : {}}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Channel badge */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
        Canal : <span className="font-bold">{cfg.label}</span>
        {!canWrite && (
          <span className="ml-auto text-[10px] font-bold opacity-60 border border-current rounded px-1.5 py-0.5">
            Lecture seule
          </span>
        )}
      </div>

      {/* Comment List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            <MessageSquare className="w-7 h-7 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">Aucun commentaire</p>
            {canWrite && (
              <p className="text-xs mt-0.5">Soyez le premier à commenter</p>
            )}
          </div>
        ) : (
          comments.map(c => {
            const isMe = c.user_id === currentUserId
            const roleLabel = c.user?.role ? ROLE_LABELS[c.user.role] || c.user.role : ''
            return (
              <div key={c.id} className="flex gap-3">
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                  style={{ background: isMe ? cfg.color : '#94A3B8' }}
                  title={fullName(c.user)}
                >
                  {initials(c.user)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{fullName(c.user)}</span>
                    {roleLabel && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {roleLabel}
                      </span>
                    )}
                    {isMe && (
                      <span className="text-[10px] font-bold text-slate-400">(vous)</span>
                    )}
                    <span className="text-[11px] text-slate-400 ml-auto">{formatDate(c.created_at)}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {c.content}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* New Comment Input */}
      {canWrite && (
        <div className="border-t border-slate-100 pt-4">
          <textarea
            rows={3}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
            }}
            placeholder={`Ajouter un commentaire interne (${cfg.label})…`}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none focus:ring-2 focus:border-transparent transition-all placeholder:text-slate-400"
            style={{ '--tw-ring-color': cfg.color } as React.CSSProperties}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-slate-400">Ctrl + Entrée pour envoyer</p>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || sending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: cfg.color }}
            >
              {sending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />
              }
              Commenter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeclarationCommentsPanel
