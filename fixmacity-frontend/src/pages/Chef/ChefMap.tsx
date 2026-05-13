import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, Search, ChevronDown, MapPin, Navigation, Loader2, Tag, Clock, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ChefLayout from '../../layouts/ChefLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

// ─── Fix Leaflet icons ────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STATUS_CFG: Record<string, { color: string; label: string; heatColor: string }> = {
  en_attente:     { color: '#F59E0B', label: 'À traiter',  heatColor: 'rgba(245,158,11,0.25)'  },
  en_cours:       { color: '#1557FF', label: 'En cours', heatColor: 'rgba(21,87,255,0.2)'    },
  resolue:        { color: '#16a34a', label: 'Résolue',  heatColor: 'rgba(22,163,74,0.2)'    },
  refusee:        { color: '#e11d48', label: 'Refusée',  heatColor: 'rgba(225,29,72,0.2)'    },
}

const LEGEND = [
  { color: '#F59E0B', label: 'À traiter' },
  { color: '#1557FF', label: 'En cours'  },
  { color: '#16a34a', label: 'Résolue'   },
  { color: '#e11d48', label: 'Refusée'   },
]

function createPin(color: string, selected = false) {
  const s = selected ? 46 : 36
  return L.divIcon({
    html: `<svg width="${s}" height="${s}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="13" fill="${color}" stroke="white" stroke-width="3.5" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.35))"/>
      <circle cx="18" cy="18" r="5.5" fill="white"/>
    </svg>`,
    className: '', iconSize: [s,s], iconAnchor: [s/2,s/2],
  })
}

function FlyTo({ coords }: { coords: [number,number] | null }) {
  const map = useMap()
  useEffect(() => { if (coords) map.flyTo(coords, 16, { duration: 1 }) }, [coords])
  return null
}

const ChefMap: React.FC = () => {
  const navigate = useNavigate()
  const [decls, setDecls] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [flyTo, setFlyTo] = useState<[number,number]|null>(null)
  const [heatmap, setHeatmap] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  const exportData = () => {
    const csvContent = [
      ['ID', 'Titre', 'Status', 'Priorite', 'Latitude', 'Longitude'],
      ...decls.map(d => [d.id, d.title, d.status, d.priority_score, d.latitude, d.longitude])
    ].map(e => e.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "carte_declarations.csv")
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredDecls = filterStatus === 'all' 
    ? decls 
    : decls.filter(d => {
        if (filterStatus === 'en_attente' && ['soumis', 'en_attente', 'transmis', 'assignee_chef'].includes(d.status)) return true;
        if (filterStatus === 'en_cours' && ['en_cours', 'assignee_agent'].includes(d.status)) return true;
        if (filterStatus === 'resolue' && ['resolue', 'cloture'].includes(d.status)) return true;
        if (filterStatus === 'refusee' && ['refusee_chef', 'refusee_agent', 'refusee'].includes(d.status)) return true;
        return d.status === filterStatus;
      });

  useEffect(() => {
    const fetchDecls = async () => {
      try {
        const token = localStorage.getItem('fmc_token')
        const res = await fetch(`${API}/chef/declarations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setDecls(data.filter((d: any) => d.latitude && d.longitude))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDecls()
  }, [])

  return (
    <ChefLayout title="Carte Interactive du Service">
      <div className="flex items-center justify-between mb-4">
         <div className="flex gap-2">
            <select 
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
               className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100"
            >
               <option value="all">Tous les statuts</option>
               <option value="en_attente">À traiter</option>
               <option value="en_cours">En cours</option>
               <option value="resolue">Résolues</option>
               <option value="refusee">Refusées</option>
            </select>
         </div>
         <button 
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-blue-600 hover:border-blue-100 transition-colors shadow-sm"
         >
            <Download className="w-4 h-4" /> Exporter
         </button>
      </div>

      <div className="h-[calc(100vh-210px)] relative rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-white">
        <MapContainer center={[35.8245, 10.6346]} zoom={13} style={{ width:'100%', height:'100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FlyTo coords={flyTo} />

          {filteredDecls.map(d => {
            let statusKey = d.status;
            if (['soumis', 'en_attente', 'transmis', 'assignee_chef'].includes(d.status)) statusKey = 'en_attente';
            if (['en_cours', 'assignee_agent'].includes(d.status)) statusKey = 'en_cours';
            if (['resolue', 'cloture'].includes(d.status)) statusKey = 'resolue';
            if (['refusee_chef', 'refusee_agent', 'refusee'].includes(d.status)) statusKey = 'refusee';

            const cfg = STATUS_CFG[statusKey] || STATUS_CFG['en_attente']
            const icon = createPin(cfg.color, selected?.id === d.id)
            return (
              <React.Fragment key={d.id}>
                {heatmap && (
                  <Circle center={[d.latitude, d.longitude]} radius={300}
                    pathOptions={{ color:'transparent', fillColor:cfg.heatColor, fillOpacity:0.6 }} />
                )}
                <Marker position={[d.latitude, d.longitude]} icon={icon}
                  eventHandlers={{ click: () => { setSelected(d); setFlyTo([d.latitude, d.longitude]) } }} />
              </React.Fragment>
            )
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-100 z-[1000]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Légende</p>
          <div className="space-y-2">
            {LEGEND.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                <span className="text-xs font-semibold text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
             <span className="text-[10px] font-bold text-slate-400 uppercase">Heatmap</span>
             <button onClick={() => setHeatmap(!heatmap)}
                className={`relative w-8 h-4 rounded-full transition-all ${heatmap ? 'bg-[#1557FF]' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${heatmap ? 'left-[18px]' : 'left-0.5'}`} />
             </button>
          </div>
        </div>

        {/* Side Detail Panel */}
        {selected && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-slate-100 shadow-2xl z-[1001] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ color: STATUS_CFG[selected.status]?.color, background: `${STATUS_CFG[selected.status]?.color}15` }}>
                {STATUS_CFG[selected.status]?.label}
              </span>
              <button onClick={() => setSelected(null)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <h3 className="font-bold text-[#0A1628] leading-tight text-base mb-1">{selected.title}</h3>
                <p className="text-[10px] font-mono text-slate-400">#{selected.ref_service || selected.id.slice(0,8)}</p>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{selected.description}</p>
              <div className="flex items-center gap-4 py-3 border-y border-slate-50">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Soumis le</span>
                  <span className="text-xs font-semibold text-[#0A1628]">{new Date(selected.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Priorité</span>
                  <span className="text-xs font-semibold text-rose-500">{selected.priority_score}%</span>
                </div>
              </div>
              {selected.photo_url && (
                <img src={selected.photo_url} className="w-full h-40 object-cover rounded-xl shadow-sm border border-slate-100" alt="" />
              )}
            </div>
            <div className="p-4 bg-slate-50">
              <button 
                onClick={() => navigate(`/chef/declarations/${selected.id}`)}
                className="w-full py-2.5 bg-[#1557FF] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200"
              >
                Gérer ce signalement
              </button>
            </div>
          </div>
        )}
      </div>
    </ChefLayout>
  )
}

export default ChefMap
