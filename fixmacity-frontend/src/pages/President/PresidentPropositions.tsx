import React, { useState, useEffect } from 'react'
import PresidentLayout from '../../layouts/PresidentLayout'
import { Plus, X, Clock, ThumbsUp, ThumbsDown, CheckCircle, Archive, Search } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const token = () => localStorage.getItem('fmc_token')

const CAT: Record<string, { color: string; bg: string }> = {
  'Éclairage public': { color: '#F59E0B', bg: '#FFFBEB' },
  'Espaces Verts':    { color: '#22C55E', bg: '#F0FDF4' },
  'Signalisation':    { color: '#F97316', bg: '#FFF7ED' },
  'Voirie':           { color: '#3B82F6', bg: '#EFF6FF' },
  'Administratif':    { color: '#8B5CF6', bg: '#F5F3FF' },
  'Propreté':         { color: '#10B981', bg: '#F0FDFA' },
  'Réseaux':          { color: '#6366F1', bg: '#EEF2FF' },
  'Suggestions':      { color: '#EC4899', bg: '#FDF2F8' },
  'Général':          { color: '#64748B', bg: '#F8FAFC' },
}

const PRI: Record<string, { color: string; bg: string; label: string }> = {
  haute:   { color: '#EF4444', bg: '#FEF2F2', label: 'Haute' },
  moyenne: { color: '#F59E0B', bg: '#FFFBEB', label: 'Moyenne' },
  basse:   { color: '#10B981', bg: '#F0FDF4', label: 'Basse' },
}

const MOCK_MY = [
  { id:'1', title:'Végétalisation Place des Martyrs', description:"Création d'un jardin urbain vertical et 20 bancs ombragés.", category:'Espaces Verts', priority:'haute', pour:1240, contre:580, total:1820, end_date:'2026-05-24', status:'active' },
  { id:'2', title:'Extension Pistes Cyclables Phase 2', description:'Prolongement de 12km de pistes cyclables sécurisées.', category:'Voirie', priority:'moyenne', pour:2100, contre:340, total:2440, end_date:'2026-06-08', status:'active' },
  { id:'3', title:'Smart Waste Sensors — Bacs Connectés', description:'Installation de capteurs IoT sur 200 bacs à ordures.', category:'Propreté', priority:'basse', pour:890, contre:620, total:1510, end_date:'2026-06-24', status:'active' },
]

const MOCK_CIT = [
  { id:'4', title:'Rénovation du stade municipal', description:'Rénovation complète du stade pour événements sportifs régionaux.', category:'Suggestions', priority:'haute', pour:3200, contre:180, total:3380, citizen:'Sami Ben Youssef', date:'2026-04-20', status:'pending' },
  { id:'5', title:'Bibliothèque numérique publique', description:"Espace coworking et bibliothèque numérique gratuite pour étudiants.", category:'Administratif', priority:'moyenne', pour:2800, contre:320, total:3120, citizen:'Ines Mansour', date:'2026-04-18', status:'pending' },
  { id:'6', title:'Marché bio hebdomadaire Jawhara', description:'Marché de producteurs locaux chaque samedi matin.', category:'Propreté', priority:'basse', pour:1650, contre:490, total:2140, citizen:'Ahmed Kamel', date:'2026-04-15', status:'pending' },
  { id:'7', title:'Éclairage solaire parc Ibn Khaldoun', description:'Remplacement lampadaires par panneaux solaires.', category:'Éclairage public', priority:'moyenne', pour:980, contre:120, total:1100, citizen:'Fatma Ben Salah', date:'2026-04-10', status:'confirmed' },
  { id:'8', title:'Piscine municipale quartier Sud', description:'Construction piscine publique pour les habitants.', category:'Suggestions', priority:'haute', pour:4100, contre:280, total:4380, citizen:'Nour Chakroun', date:'2026-04-08', status:'retained' },
]

const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000))

interface Prop { id:string; title:string; description:string; category:string; priority:string; pour:number; contre:number; total:number; end_date?:string; status:string; citizen?:string; date?:string }

const VoteBar = ({ pour, contre, total }: { pour:number; contre:number; total:number }) => {
  const p = total > 0 ? Math.round(pour / total * 100) : 0
  return (
    <div className="mt-4 bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2">
        <span className="text-emerald-600">Favorable {p}%</span>
        <span className="text-slate-400">{total.toLocaleString()} votes</span>
        <span className="text-rose-500">Défavorable {100-p}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white shadow-inner overflow-hidden flex border border-slate-100">
        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000" style={{width:`${p}%`}}/>
        <div className="h-full bg-rose-400 transition-all duration-1000" style={{width:`${100-p}%`}}/>
      </div>
    </div>
  )
}

const PropCard = ({ prop, isCitizen, onConfirm, onRetain }: { prop:Prop; isCitizen?:boolean; onConfirm?:(id:string)=>void; onRetain?:(id:string)=>void }) => {
  const cat = CAT[prop.category] || CAT['Général']
  const pri = PRI[prop.priority] || PRI['moyenne']
  const done = prop.status !== 'pending' && isCitizen
  
  return (
    <div className={`group bg-white rounded-3xl border transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] ${done ? 'opacity-80 border-slate-100' : 'border-slate-200'} flex flex-col overflow-hidden`}>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded shadow-sm transition-all" style={{color:cat.color, background:cat.bg}}>{prop.category}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded border shadow-sm" style={{color:pri.color, background:pri.bg, borderColor: `${pri.color}20` }}>{pri.label}</span>
          </div>
          {done && (
            <span className={`text-[8px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded border shadow-sm ${prop.status==='confirmed'?'bg-emerald-50 text-emerald-600 border-emerald-100':'bg-amber-50 text-amber-600 border-amber-100'}`}>
              {prop.status==='confirmed'?'✓ Publiée':'📌 Archivée'}
            </span>
          )}
        </div>

        <div className="mb-4">
          <h3 className="font-black text-[#0A1628] text-sm leading-tight mb-2 group-hover:text-[#1557FF] transition-colors">{prop.title}</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{prop.description}</p>
        </div>
        
        {isCitizen && prop.citizen && (
          <div className="flex items-center gap-3 py-3 mb-2 border-y border-slate-50">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-[#0A1628] shadow-sm">
              {prop.citizen.split(' ').map((w:string)=>w[0]).join('')}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-[#0A1628]">{prop.citizen}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{prop.date}</span>
            </div>
          </div>
        )}

        <div className="mt-auto">
          <VoteBar pour={prop.pour} contre={prop.contre} total={prop.total}/>
          {prop.end_date && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5"/>
                <span className="text-[10px] font-black uppercase tracking-widest">Fin du vote</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${daysLeft(prop.end_date) < 3 ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                {daysLeft(prop.end_date)} JOURS RESTANTS
              </span>
            </div>
          )}
        </div>
      </div>

      {isCitizen && !done && (
        <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex gap-2">
          <button onClick={()=>onConfirm?.(prop.id)} className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white bg-[#1557FF] hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all">
            Valider
          </button>
          <button onClick={()=>onRetain?.(prop.id)} className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
            Retenir
          </button>
        </div>
      )}
    </div>
  )
}

const PresidentPropositions: React.FC = () => {
  const [tab, setTab] = useState<'mine'|'citizen'>('mine')
  const [viewMode, setViewMode] = useState<'board'|'list'>('board')
  const [myProps, setMyProps] = useState<Prop[]>([])
  const [citProps, setCitProps] = useState<Prop[]>([])
  const [search, setSearch] = useState('')
  const [catF, setCatF] = useState('Tous')
  const [showCreate, setShowCreate] = useState(false)
  const [newProp, setNewProp] = useState({ title:'', description:'', start_date:'', end_date:'', category:'Voirie', priority:'moyenne' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/president/propositions`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        const data = await res.json()
        const mapProp = (p: any) => ({
          ...p,
          priority: p.priority || (p.total > 2000 ? 'haute' : p.total > 500 ? 'moyenne' : 'basse'),
          category: p.category || 'Général',
          date: new Date(p.created_at).toLocaleDateString()
        })
        setMyProps((data.presidential || []).map(mapProp))
        setCitProps((data.citizen || []).map(mapProp))
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const COLS = [
    { key:'pending',   label:'En attente', color:'#F59E0B', bg:'#FFFBEB' },
    { key:'confirmed', label:'Confirmées', color:'#10B981', bg:'#F0FDF4' },
    { key:'retained',  label:'Retenues',   color:'#8B5CF6', bg:'#F5F3FF' },
  ]

  const act = async (id: string, action: string) => {
    try {
      const endpoint = action === 'confirmer' ? 'confirmer' : 'retenu'
      const res = await fetch(`${API}/president/propositions/${id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.ok) {
        setCitProps(prev => prev.map(p => p.id===id ? {...p, status: action==='confirmer'?'confirmed':'retained'} : p))
      }
    } catch (_) {}
  }

  const handleCreate = async () => {
    if (!newProp.title || !newProp.description || !newProp.end_date) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/president/propositions`, {
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},
        body:JSON.stringify({
          ...newProp,
          start_date: newProp.start_date || null,
          end_date: newProp.end_date || null
        })
      })
      if (res.ok) {
        await load()
        setShowCreate(false)
        setNewProp({title:'',description:'',start_date:'',end_date:'',category:'Voirie',priority:'moyenne'})
      }
    } catch(_) {}
    setSaving(false)
  }

  const filter = (arr: Prop[]) => arr.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    if (catF !== 'Tous' && p.category !== catF) return false
    return true
  })

  if (loading) return (
    <PresidentLayout title="Gestion des Propositions">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1557FF]"></div>
      </div>
    </PresidentLayout>
  )

  return (
    <PresidentLayout title="Gestion des Propositions">
      <div className="flex-1 bg-[#f8fafc] p-6 min-h-screen">
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            {(['mine','citizen'] as const).map(t => (
              <button key={t} onClick={()=>setTab(t)}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab===t?'text-white shadow-lg shadow-blue-500/20':'text-slate-400 hover:text-slate-600'}`}
                style={tab===t?{background:'#1557FF'}:{}}>
                {t==='mine'?`Mes Propositions` : `Citoyennes`}
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[9px] ${tab===t ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {t==='mine' ? myProps.length : citProps.length}
                </span>
              </button>
            ))}
          </div>
          
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            {([['board','⊞'],['list','≡']] as const).map(([m,l]) => (
              <button key={m} onClick={()=>setViewMode(m as any)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${viewMode===m?'text-white shadow-lg shadow-blue-500/20':'text-slate-400 hover:text-slate-600'}`}
                style={viewMode===m?{background:'#1557FF'}:{}}>
                {l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex-1 max-w-xs shadow-sm focus-within:border-blue-400 transition-colors">
            <Search className="w-4 h-4 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une proposition..." className="text-xs text-slate-600 font-bold placeholder-slate-300 outline-none bg-transparent flex-1"/>
          </div>

          <select value={catF} onChange={e=>setCatF(e.target.value)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none cursor-pointer shadow-sm hover:border-blue-400 transition-colors">
            <option>Tous</option>
            {Object.keys(CAT).map(c=><option key={c}>{c}</option>)}
          </select>

          {tab==='mine' && (
            <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest ml-auto hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 transition-all shadow-lg" style={{background:'#1557FF'}}>
              <Plus className="w-4 h-4"/> Nouvelle Proposition
            </button>
          )}
        </div>

      {tab==='mine' && viewMode==='board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filter(myProps).map(p=><PropCard key={p.id} prop={p}/>)}
        </div>
      )}

      {tab==='mine' && viewMode==='list' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Proposition</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Adhésion</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Votes</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Échéance</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filter(myProps).map(p => {
                const pri=PRI[p.priority]||PRI['moyenne']
                const pPct = p.total > 0 ? Math.round(p.pour / p.total * 100) : 0
                const days=p.end_date?daysLeft(p.end_date):null
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex gap-1 mb-1">
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm" style={{color:CAT[p.category]?.color || CAT['Général'].color, background:CAT[p.category]?.bg || CAT['Général'].bg}}>{p.category}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border" style={{color:pri.color, background:pri.bg, borderColor: `${pri.color}20` }}>{pri.label}</span>
                        </div>
                        <p className="text-sm font-bold text-[#0A1628] truncate max-w-[300px] group-hover:text-blue-600 transition-colors">{p.title}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32">
                        <div className="flex justify-between text-[9px] font-black mb-1 text-slate-400">
                          <span>POUR {pPct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{width:`${pPct}%`}}/>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4">
                        <div className="text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Pour</p>
                          <p className="text-[11px] font-bold text-emerald-600">{p.pour.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Total</p>
                          <p className="text-[11px] font-bold text-slate-700">{p.total.toLocaleString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-bold ${days!==null && days < 5 ? 'text-red-500' : 'text-slate-500'}`}>
                        {days!==null?`${days} jours`:'—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button className="text-slate-300 hover:text-blue-600 font-black">···</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab==='citizen' && viewMode==='board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLS.map(col=>{
            const colProps=filter(citProps).filter(p=>p.status===col.key)
            return (
              <div key={col.key}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background:col.color}}/>
                  <h3 className="text-sm font-black text-[#0A1628]">{col.label}</h3>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{background:col.bg,color:col.color}}>{colProps.length}</span>
                </div>
                <div className="space-y-3">
                  {colProps.map(p=><PropCard key={p.id} prop={p} isCitizen onConfirm={id=>act(id,'confirmer')} onRetain={id=>act(id,'retenu')}/>)}
                  {colProps.length===0&&(
                    <div className="h-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                      <p className="text-xs text-slate-300 font-semibold">Aucune proposition</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab==='citizen' && viewMode==='list' && (
        <div className="grid gap-3">
          {filter(citProps).map(p=>{
            const cat=CAT[p.category]||CAT['Général']
            const done=p.status!=='pending'
            const pPct = p.total > 0 ? Math.round(p.pour / p.total * 100) : 0
            return (
              <div key={p.id} className="group bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-400 hover:shadow-lg transition-all flex flex-wrap items-center gap-6">
                <div className="flex-1 min-w-[240px]">
                   <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm transition-all" style={{color:cat.color, background:cat.bg}}>{p.category}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${p.status==='confirmed'?'bg-emerald-100 text-emerald-700':p.status==='retained'?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-500'}`}>
                      {p.status==='confirmed'?'Confirmée':p.status==='retained'?'Retenue':'En attente'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0A1628] mb-1">{p.title}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-500">
                      {p.citizen?.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <span className="text-[11px] font-bold text-slate-600">{p.citizen}</span>
                    <span className="text-[10px] text-slate-400">· {p.date}</span>
                  </div>
                </div>

                <div className="w-48">
                  <div className="flex justify-between text-[9px] font-black mb-1 text-slate-400">
                    <span>POUR {pPct}%</span>
                    <span>{p.total.toLocaleString()} VOTES</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width:`${pPct}%`}}/>
                  </div>
                </div>

                {!done ? (
                  <div className="flex gap-2">
                    <button onClick={()=>act(p.id,'confirmer')} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95" style={{background:'#1557FF'}}>Confirmer</button>
                    <button onClick={()=>act(p.id,'retenu')} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-95">Retenir</button>
                  </div>
                ) : (
                  <div className="w-32 flex justify-end">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Traitée</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setShowCreate(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-[#0A1628]">Nouvelle Proposition</h2>
              <button onClick={()=>setShowCreate(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4"/></button>
            </div>
            <div className="space-y-3">
              <input value={newProp.title} onChange={e=>setNewProp(p=>({...p,title:e.target.value}))} placeholder="Titre" className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"/>
              <textarea value={newProp.description} onChange={e=>setNewProp(p=>({...p,description:e.target.value}))} placeholder="Description..." rows={4} className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-none"/>
              <div className="grid grid-cols-2 gap-3">
                <select value={newProp.category} onChange={e=>setNewProp(p=>({...p,category:e.target.value}))} className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none">
                  {Object.keys(CAT).map(c=><option key={c}>{c}</option>)}
                </select>
                <select value={newProp.priority} onChange={e=>setNewProp(p=>({...p,priority:e.target.value}))} className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none">
                  <option value="haute">Haute</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="basse">Basse</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de début</p>
                  <input type="date" value={newProp.start_date} onChange={e=>setNewProp(p=>({...p,start_date:e.target.value}))} className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 font-bold text-[#0A1628]"/>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de fin <span className="text-rose-500">*</span></p>
                  <input type="date" value={newProp.end_date} onChange={e=>setNewProp(p=>({...p,end_date:e.target.value}))} className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 font-bold text-[#0A1628]"/>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowCreate(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Annuler</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-60" style={{background:'#1557FF'}}>{saving?'Publication...':'Publier'}</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PresidentLayout>
  )
}

export default PresidentPropositions