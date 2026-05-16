import React from 'react'
import { 
  FilePlus, UserPlus, Building2, Vote, X, 
  ChevronRight, Sparkles, PlusCircle, ShieldCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const CreateActionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()

  if (!isOpen) return null

  const ACTIONS = [
    {
      id: 'declaration',
      title: 'Nouvelle Déclaration',
      desc: 'Signaler un problème municipal ou un incident.',
      icon: FilePlus,
      color: '#1557FF',
      bg: '#EEF2FF',
      to: '/president/declarations'
    },
    {
      id: 'personnel',
      title: 'Ajouter du Personnel',
      desc: 'Recruter un nouvel agent ou chef de service.',
      icon: UserPlus,
      color: '#10B981',
      bg: '#F0FDF4',
      to: '/president/personnel'
    },
    {
      id: 'service',
      title: 'Nouveau Service',
      desc: 'Créer un nouveau département municipal.',
      icon: Building2,
      color: '#F59E0B',
      bg: '#FFFBEB',
      to: '/president/services'
    },
    {
      id: 'proposition',
      title: 'Nouvelle Proposition',
      desc: 'Lancer une initiative pour vote citoyen.',
      icon: Vote,
      color: '#8B5CF6',
      bg: '#F5F3FF',
      to: '/president/propositions'
    }
  ]

  const handleAction = (to: string) => {
    navigate(to)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0A1628]/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-300 border border-white dark:border-slate-800">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-50 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <PlusCircle className="w-32 h-32 text-[#1557FF]" />
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#1557FF]" />
                </span>
                <span className="text-[10px] font-black text-[#1557FF] uppercase tracking-[0.2em]">Actions Rapides</span>
              </div>
              <h2 className="text-2xl font-black text-[#0A1628] dark:text-white leading-tight">Que souhaitez-vous créer ?</h2>
              <p className="text-sm text-slate-400 font-medium mt-1">Sélectionnez une action pour commencer.</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="p-4 grid grid-cols-1 gap-2">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.to)}
              className="group flex items-center gap-4 p-4 rounded-3xl transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 text-left relative overflow-hidden active:scale-[0.98]"
            >
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-500 shadow-sm"
                style={{ backgroundColor: action.bg, color: action.color }}
              >
                <action.icon className="w-6 h-6" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-[#0A1628] dark:text-slate-200 text-base leading-tight group-hover:text-[#1557FF] transition-colors">
                  {action.title}
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  {action.desc}
                </p>
              </div>

              <div className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 group-hover:border-blue-100 group-hover:text-[#1557FF] transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-300" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Sécurisée</span>
          </div>
          <span className="text-[10px] font-black text-slate-300">FIXMACITY v2.0</span>
        </div>

      </div>
    </div>
  )
}

export default CreateActionModal
