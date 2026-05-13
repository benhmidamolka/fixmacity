import React from 'react'
import { 
  BarChart2, TrendingUp, CheckCircle, Clock, 
  MapPin, Star, Calendar, ArrowUpRight,
  Target, Zap, Shield
} from 'lucide-react'
import AgentLayout from '../../components/agent/AgentLayout'

const AgentStats: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('fmc_user') || '{}')

  const STATS = [
    { label: 'Résolues', value: '12', icon: CheckCircle, color: '#10B981', bg: '#F0FDF4', trend: '+2 cette semaine' },
    { label: 'Délai Moyen', value: '1.2j', icon: Clock, color: '#1557FF', bg: '#EEF2FF', trend: '-15% vs mois dernier' },
    { label: 'Soutiens', value: '142', icon: Star, color: '#F59E0B', bg: '#FFFBEB', trend: 'Top 10% agents' },
    { label: 'Zones', value: '3', icon: MapPin, color: '#8B5CF6', bg: '#F5F3FF', trend: 'Sousse Ville & Nord' },
  ]

  const PERFORMANCE = [
    { label: 'Rapidité', value: 92 },
    { label: 'Qualité photo', value: 85 },
    { label: 'Satisfaction', value: 98 },
    { label: 'Respect dates', value: 100 },
  ]

  return (
    <AgentLayout title="Mes Statistiques">
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-[#0A1628] to-[#1e293b] rounded-[2.5rem] p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-3xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 ring-4 ring-white/10">
              <TrendingUp className="w-12 h-12" />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-black text-white">Performance Agent</h2>
              <p className="text-slate-400 mt-2 max-w-md">
                Bravo {user.first_name}, vos indicateurs sont excellents ce mois-ci. Vous êtes dans le top 5% des agents les plus réactifs.
              </p>
            </div>
            <div className="md:ml-auto bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 flex items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Score Global</p>
                <p className="text-4xl font-black text-white">9.8</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Position</p>
                <p className="text-4xl font-black text-white">#2</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span className="text-[10px] font-bold">LIVE</span>
                </div>
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-3xl font-black text-[#0A1628] mt-1">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-2">{s.trend}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detailed Performance */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-[#0A1628]">Analyse de Qualité</h3>
                <p className="text-sm text-slate-400">Évaluation basée sur les retours chefs et citoyens</p>
              </div>
              <Target className="w-6 h-6 text-slate-200" />
            </div>
            
            <div className="space-y-6">
              {PERFORMANCE.map(p => (
                <div key={p.label}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black text-[#0A1628] uppercase tracking-wide">{p.label}</span>
                    <span className="text-sm font-black text-emerald-600">{p.value}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${p.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-xs font-bold text-[#0A1628]">Point fort</p>
                  <p className="text-[10px] text-slate-500">Réactivité sur les urgences</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-xs font-bold text-[#0A1628]">Fiabilité</p>
                  <p className="text-[10px] text-slate-500">Zéro refus non justifié</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-[#0A1628] mb-6">Activité Récente</h3>
            <div className="space-y-6">
              {[
                { date: 'Aujourd\'hui', action: 'Signalement résolu', id: 'VR-22-04-26', color: '#10B981' },
                { date: 'Hier', action: 'Mission acceptée', id: 'EL-21-04-12', color: '#3B82F6' },
                { date: '12 Mai', action: 'Signalement résolu', id: 'PR-19-05-02', color: '#10B981' },
                { date: '10 Mai', action: 'Message envoyé au chef', id: 'EV-18-05-10', color: '#8B5CF6' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm ring-2 ring-slate-100" style={{ background: item.color }} />
                    {i < 3 && <div className="w-px h-full bg-slate-100 my-1" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{item.date}</p>
                    <p className="text-xs font-black text-[#0A1628]">{item.action}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.id}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 rounded-2xl border border-slate-100 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all">
              Voir tout l'historique
            </button>
          </div>
        </div>
      </div>
    </AgentLayout>
  )
}

export default AgentStats
