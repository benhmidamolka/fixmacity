import React from 'react'
import { 
  Bell, AlertCircle, CheckCircle2, MessageSquare, 
  Clock, Trash2, MoreVertical, Search, Filter
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const AgentNotifications: React.FC = () => {
  const NOTIFS = [
    {
      id: '1',
      title: 'Nouvelle mission assignée',
      desc: 'Le Chef Karim Mansour vous a assigné "Nid-de-poule dangereux Av. Bourguiba".',
      time: 'il y a 10 minutes',
      type: 'assignment',
      read: false
    },
    {
      id: '2',
      title: 'Nouveau message du chef',
      desc: 'Karim Mansour : "Aymen, n\'oublie pas de prendre les balises de sécurité."',
      time: 'il y a 2 heures',
      type: 'message',
      read: false
    },
    {
      id: '3',
      title: 'Intervention validée',
      desc: 'Votre résolution de "Trottoir effondré" a été validée par le service technique.',
      time: 'Hier',
      type: 'success',
      read: true
    },
    {
      id: '4',
      title: 'Rappel : Mission en attente',
      desc: 'La mission "Éclairage public Rue de Marseille" est en attente depuis 24h.',
      time: 'Hier',
      type: 'warning',
      read: true
    }
  ]

  const ICONS: Record<string, any> = {
    assignment: { icon: AlertCircle, color: '#3B82F6', bg: '#EFF6FF' },
    message:    { icon: MessageSquare, color: '#8B5CF6', bg: '#F5F3FF' },
    success:    { icon: CheckCircle2, color: '#10B981', bg: '#F0FDF4' },
    warning:    { icon: Bell, color: '#F59E0B', bg: '#FFFBEB' },
  }

  return (
    <AgentLayout title="Notifications">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Chercher une notification..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              <Filter className="w-4 h-4" /> Filtrer
            </button>
            <button className="flex-1 sm:flex-none py-3 px-5 rounded-2xl bg-emerald-600 text-white text-sm font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">
              Tout marquer comme lu
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {NOTIFS.map(n => {
              const cfg = ICONS[n.type]
              return (
                <div key={n.id} className={`group flex items-start gap-4 p-6 hover:bg-slate-50/50 transition-all cursor-pointer ${!n.read ? 'bg-emerald-50/30' : ''}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm`} style={{ background: cfg.bg }}>
                    <cfg.icon className="w-6 h-6" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className={`text-sm font-black ${n.read ? 'text-[#0A1628]' : 'text-emerald-900'}`}>
                        {n.title}
                        {!n.read && <span className="ml-2 w-2 h-2 bg-emerald-500 rounded-full inline-block" />}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{n.time}</span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                      {n.desc}
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">
                        Voir le détail
                      </button>
                      <button className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors">
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-slate-600 transition-all">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
          
          <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex justify-center">
            <button className="flex items-center gap-2 text-sm font-black text-slate-400 hover:text-[#0A1628] transition-colors">
              <Clock className="w-4 h-4" /> Voir les notifications plus anciennes
            </button>
          </div>
        </div>

        {/* Clear All */}
        <div className="flex justify-center">
          <button className="flex items-center gap-2 text-red-400 hover:text-red-600 text-xs font-bold transition-colors">
            <Trash2 className="w-4 h-4" /> Effacer tout l'historique des notifications
          </button>
        </div>
      </div>
    </AgentLayout>
  )
}

export default AgentNotifications
