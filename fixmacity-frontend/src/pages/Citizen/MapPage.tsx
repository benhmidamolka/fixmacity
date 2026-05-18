import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, Search, ChevronDown, MapPin, Camera, Navigation, Loader2, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

// ─── Fix Leaflet default icons ────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; label: string; heatColor: string }> = {
  soumise:        { color: '#F59E0B', label: 'Soumise',  heatColor: 'rgba(245,158,11,0.28)' },
  assignee_chef:  { color: '#1557FF', label: 'En cours', heatColor: 'rgba(21,87,255,0.22)'  },
  assignee_agent: { color: '#1557FF', label: 'En cours', heatColor: 'rgba(21,87,255,0.22)'  },
  en_cours:       { color: '#1557FF', label: 'En cours', heatColor: 'rgba(21,87,255,0.22)'  },
  resolue:        { color: '#16a34a', label: 'Résolue',  heatColor: 'rgba(22,163,74,0.22)'  },
  cloturee:       { color: '#16a34a', label: 'Résolue',  heatColor: 'rgba(22,163,74,0.22)'  },
  refusee_chef:   { color: '#EF4444', label: 'Refusée',  heatColor: 'rgba(239,68,68,0.22)'  },
  refusee_agent:  { color: '#EF4444', label: 'Refusée',  heatColor: 'rgba(239,68,68,0.22)'  },
}
const getCfg = (status: string) => STATUS_CFG[status] ?? STATUS_CFG['soumise']

const LEGEND = [
  { color: '#F59E0B', label: 'Soumise'  },
  { color: '#1557FF', label: 'En cours' },
  { color: '#16a34a', label: 'Résolue'  },
  { color: '#EF4444', label: 'Refusée'  },
]

// ─── Tile layers ──────────────────────────────────────────────────────────────
// Light = standard OSM / Carto Voyager  |  Dark = Carto DarkMatter
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTR       = '&copy; <a href="https://carto.com">CARTO</a>'

const CATEGORIES      = ['Toutes catégories', 'Voirie', 'Éclairage', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation']
const ARRONDISSEMENTS = ['Tout Sousse', 'Sousse Ville', 'Sousse Jawhara', 'Sousse Sidi Abdelhamid']
const STATUSES        = ['Tous statuts', 'Soumise', 'En cours', 'Résolue', 'Refusée']
const TIMELINE_STEPS  = ['Soumis', 'Assigné', 'Intervention', 'Résolution']

const MOCK: any[] = [
  { id:'1', title:'Éclairage défectueux – Avenue de la République', description:'Le lampadaire clignote depuis deux nuits.', category:'Éclairage', status:'en_cours',  latitude:35.8270, longitude:10.6370, address:'Avenue de la République, Sousse', created_at:'2026-04-20T21:15:00Z', history:[{changed_at:'2026-04-20T21:15:00Z'},{changed_at:'2026-04-21T09:30:00Z'},null,null] },
  { id:'2', title:'Nid de poule Av. Bourguiba',                     description:'Grand trou dangereux devant le marché.',     category:'Voirie',     status:'soumise',   latitude:35.8256, longitude:10.6346, address:'Av. Habib Bourguiba, Sousse',    created_at:'2026-04-22T10:00:00Z' },
  { id:'3', title:'Déchets non collectés Cité Ettaamir',            description:'Accumulation de déchets depuis 3 jours.',   category:'Propreté',   status:'cloturee',  latitude:35.8220, longitude:10.6300, address:'Cité Ettaamir, Sousse',           created_at:'2026-04-18T08:00:00Z', rating:4, rating_comment:'Ramassage fait rapidement, satisfait.', history:[{changed_at:'2026-04-18T08:00:00Z'},{changed_at:'2026-04-19T10:00:00Z'},{changed_at:'2026-04-20T14:00:00Z'},{changed_at:'2026-04-22T09:00:00Z'}] },
  { id:'4', title:"Fuite d'eau rue Ibn Khaldoun",                    description:'Fuite importante depuis hier matin.',       category:'Réseaux',    status:'cloturee',  latitude:35.8240, longitude:10.6420, address:'Rue Ibn Khaldoun, Sousse',        created_at:'2026-04-10T12:00:00Z', history:[{changed_at:'2026-04-10T12:00:00Z'},{changed_at:'2026-04-11T08:00:00Z'},{changed_at:'2026-04-13T10:00:00Z'},{changed_at:'2026-04-15T16:00:00Z'}] },
  { id:'5', title:'Panneau stop cassé rond-point nord',              description:'Stop illisible, dangereux.',                category:'Signalisation',status:'soumise', latitude:35.8300, longitude:10.6310, address:'Rond-point Nord, Sousse',         created_at:'2026-04-25T09:00:00Z' },
  { id:'6', title:'Arbres dangereux Parc de la Ligue Arabe',        description:'Branches menaçant de tomber.',              category:'Espaces Verts',status:'cloturee',latitude:35.8278, longitude:10.6389, address:'Parc de la Ligue Arabe, Sousse', created_at:'2026-04-05T11:00:00Z', rating:5, rating_comment:'Excellent travail, très professionnel !', history:[{changed_at:'2026-04-05T11:00:00Z'},{changed_at:'2026-04-06T08:00:00Z'},{changed_at:'2026-04-08T10:00:00Z'},{changed_at:'2026-04-10T15:00:00Z'}] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function createPin(color: string, selected = false) {
  const s = selected ? 50 : 38
  return L.divIcon({
    html: `<svg width="${s}" height="${s}" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
      ${selected ? `<circle cx="19" cy="19" r="18" fill="${color}" opacity="0.18"/>` : ''}
      <circle cx="19" cy="19" r="13" fill="${color}" stroke="white" stroke-width="3.5" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.4))"/>
      <circle cx="19" cy="19" r="5.5" fill="white"/>
    </svg>`,
    className: '', iconSize: [s, s], iconAnchor: [s/2, s/2],
  })
}

function FlyTo({ coords }: { coords: [number,number] | null }) {
  const map = useMap()
  useEffect(() => { if (coords) map.flyTo(coords, 16, { duration: 1 }) }, [coords])
  return null
}

function TileLayerSwitch({ dark }: { dark: boolean }) {
  return <TileLayer url={dark ? TILE_DARK : TILE_LIGHT} attribution={ATTR} />
}

function getStep(status: string) {
  if (['soumise','assignee_chef','assignee_agent'].includes(status)) return 1
  if (status === 'en_cours') return 2
  if (status === 'resolue')  return 3
  if (status === 'cloturee') return 4
  return 0
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function Timeline({ status, history, dark }: { status: string; history?: any[]; dark: boolean }) {
  const active = getStep(status)
  return (
    <div className="mt-3 space-y-2">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < active
        const h    = history?.[i]
        return (
          <div key={step} className="flex items-start gap-2.5">
            <div className="flex flex-col items-center">
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5 ${done ? 'bg-[#1557FF] border-[#1557FF]' : dark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`} />
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 h-5 ${i < active - 1 ? 'bg-[#1557FF]' : dark ? 'bg-slate-700' : 'bg-slate-200'}`} />
              )}
            </div>
            <div>
              <p className={`text-xs font-semibold leading-tight ${done ? (dark ? 'text-slate-100' : 'text-[#0A1628]') : dark ? 'text-slate-500' : 'text-slate-400'}`}>
                {step}
              </p>
              {h?.changed_at && (
                <p className={`text-[10px] mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {new Date(h.changed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  {' · '}
                  {new Date(h.changed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Side Panel ───────────────────────────────────────────────────────────────
function SidePanel({ decl, onClose, dark }: { decl: any; onClose: () => void; dark: boolean }) {
  const cfg      = getCfg(decl.status)
  const isClosed = ['resolue','cloturee'].includes(decl.status)

  const panel   = dark ? 'bg-slate-900 border-slate-800'   : 'bg-white border-slate-100'
  const border  = dark ? 'border-slate-800'                 : 'border-slate-100'
  const title   = dark ? 'text-slate-100'                   : 'text-[#0A1628]'
  const sub     = dark ? 'text-slate-400'                   : 'text-slate-500'
  const muted   = dark ? 'text-slate-500'                   : 'text-slate-400'
  const cardBg  = dark ? 'bg-slate-800 border-slate-700'    : 'bg-white border-amber-100'

  return (
    <div className={`absolute top-0 right-0 bottom-0 w-[320px] shadow-2xl z-[1000] flex flex-col border-l ${panel}`}>
      {/* Header */}
      <div className={`px-5 pt-4 pb-3 border-b ${border} flex items-center justify-between`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{ color: cfg.color, background: `${cfg.color}22` }}>
            {cfg.label}
          </span>
          {decl.category && (
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {decl.category}
            </span>
          )}
        </div>
        <button onClick={onClose}
          className={`p-1.5 rounded-lg transition-all ${dark ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Title + date */}
        <div>
          {decl.created_at && (
            <p className={`text-[11px] mb-1 ${muted}`}>
              Soumis le {new Date(decl.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
          <h3 className={`font-bold text-[15px] leading-tight ${title}`}>{decl.title}</h3>
          {decl.address && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${muted}`}>
              <MapPin className="w-3 h-3" />{decl.address}
            </p>
          )}
        </div>

        <p className={`text-sm leading-relaxed ${sub}`}>{decl.description}</p>

        {/* Timeline */}
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>Suivi de l'intervention</p>
          <Timeline status={decl.status} history={decl.history} dark={dark} />
        </div>

        {/* Photo */}
        {decl.photo_url && (
          <img src={decl.photo_url} alt="" className="w-full h-36 object-cover rounded-xl" />
        )}

        {/* Rating */}
        {isClosed && (decl.rating || decl.rating_comment) && (
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${muted}`}>Évaluation du citoyen</p>
            <div className={`border rounded-xl p-4 ${dark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50 border-amber-100'}`}>
              {decl.rating && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className={`text-lg ${i <= decl.rating ? 'text-amber-400' : dark ? 'text-slate-700' : 'text-slate-200'}`}>★</span>
                    ))}
                  </div>
                  <span className={`text-sm font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{decl.rating}/5</span>
                </div>
              )}
              {decl.rating_comment && (
                <div className={`rounded-lg px-3 py-2 border ${cardBg}`}>
                  <p className={`text-xs italic ${dark ? 'text-slate-400' : 'text-slate-600'}`}>"{decl.rating_comment}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────
function Dropdown({ label, options, value, onChange, dark }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; dark: boolean
}) {
  const [open, setOpen] = useState(false)
  const btn   = dark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-blue-500' : 'bg-white border-slate-200 text-slate-700 hover:border-[#1557FF]'
  const menu  = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const item  = (active: boolean) => active
    ? (dark ? 'text-blue-400 font-bold bg-blue-900/30' : 'text-[#1557FF] font-bold bg-blue-50')
    : (dark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50')

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all min-w-32 ${btn}`}>
        {value === options[0] ? label : value}
        <ChevronDown className="w-4 h-4 ml-auto" />
      </button>
      {open && (
        <div className={`absolute top-full mt-1 left-0 border rounded-xl shadow-xl z-[1100] min-w-44 py-1 ${menu}`}>
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${item(value === o)}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Address suggestion ───────────────────────────────────────────────────────
interface Suggestion { display_name: string; lat: string; lon: string }

// ─── Main ─────────────────────────────────────────────────────────────────────
const MapPage: React.FC = () => {
  const navigate = useNavigate()
  const fileRef  = useRef<HTMLInputElement>(null)

  // Sync dark mode from localStorage (same key as CitizenLayout)
  const [dark, setDark] = useState(() => localStorage.getItem('fmc_theme') === 'dark')
  useEffect(() => {
    const check = () => setDark(localStorage.getItem('fmc_theme') === 'dark')
    check()
    window.addEventListener('storage', check)
    const iv = setInterval(check, 300)
    return () => { window.removeEventListener('storage', check); clearInterval(iv) }
  }, [])

  const [decls,       setDecls]       = useState<any[]>(MOCK)
  const [selected,    setSelected]    = useState<any>(null)
  const [flyTo,       setFlyTo]       = useState<[number,number]|null>(null)
  const [search,      setSearch]      = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching,   setSearching]   = useState(false)
  const [showSugg,    setShowSugg]    = useState(false)
  const searchTimeout                 = useRef<any>(null)
  const [catFilter,   setCatFilter]   = useState(CATEGORIES[0])
  const [arrFilter,   setArrFilter]   = useState(ARRONDISSEMENTS[0])
  const [statFilter,  setStatFilter]  = useState(STATUSES[0])
  const [heatmap,     setHeatmap]     = useState(false)

  const token = localStorage.getItem('fmc_token')

  useEffect(() => {
    fetch(`${API}/declarations/map`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { const arr = Array.isArray(d) ? d : (d.declarations || []); if (arr.length) setDecls(arr) })
      .catch(() => {})
  }, [])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout(searchTimeout.current)
    if (val.length < 3) { setSuggestions([]); setShowSugg(false); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val + ' Sousse Tunisie')}&format=json&limit=5`)
        const data: Suggestion[] = await res.json()
        setSuggestions(data); setShowSugg(data.length > 0)
      } catch { setSuggestions([]) }
      finally { setSearching(false) }
    }, 400)
  }

  const handleSelectSuggestion = (s: Suggestion) => {
    setSearch(s.display_name.split(',').slice(0, 2).join(','))
    setFlyTo([parseFloat(s.lat), parseFloat(s.lon)])
    setShowSugg(false); setSuggestions([])
  }

  const handlePhotoSelected = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      sessionStorage.setItem('map_photo_b64', e.target?.result as string)
      sessionStorage.setItem('map_photo_name', file.name)
      sessionStorage.setItem('map_photo_type', file.type)
      const center = flyTo || [35.8245, 10.6346]
      sessionStorage.setItem('map_photo_lat', String(center[0]))
      sessionStorage.setItem('map_photo_lng', String(center[1]))
      navigate('/nouveau-signalement?from=map')
    }
    reader.readAsDataURL(file)
  }

  const filtered = decls.filter(d => {
    if (!d?.status) return false
    const ns  = d.status.toLowerCase()
    const cfg = STATUS_CFG[ns]; if (!cfg) return false
    if (catFilter  !== CATEGORIES[0]      && d.category !== catFilter) return false
    if (statFilter !== STATUSES[0]        && cfg.label !== statFilter) return false
    if (arrFilter  !== ARRONDISSEMENTS[0] && d.arrondissement && d.arrondissement !== arrFilter) return false
    return d.latitude != null && d.longitude != null
  })

  // ── Derived styles from dark mode ─────────────────────────────────────────
  const filterBar = dark
    ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md'
    : 'bg-white border-slate-100 backdrop-blur-sm'
  const searchInp = dark
    ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:bg-slate-700'
    : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-[#1557FF] focus:bg-white'
  const suggMenu  = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const suggItem  = dark ? 'text-slate-300 hover:bg-blue-900/30 hover:text-blue-400' : 'text-slate-700 hover:bg-blue-50 hover:text-[#1557FF]'
  const overlay   = dark ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-700'
  const legendTx  = dark ? 'text-slate-400' : 'text-slate-600'
  const legendSub = dark ? 'text-slate-500' : 'text-slate-500'
  const togBtn    = (on: boolean) => on ? 'text-blue-400' : (dark ? 'text-slate-500' : 'text-slate-400')
  const togTrack  = (on: boolean) => on ? 'bg-[#1557FF]' : (dark ? 'bg-slate-700' : 'bg-slate-200')

  return (
    <CitizenLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col">

        {/* ── Filter bar ── */}
        <div className={`border-b px-4 py-3 flex items-center gap-3 z-10 shadow-sm flex-wrap ${filterBar}`}>

          {/* Address search */}
          <div className="relative flex-1 min-w-52">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
            {searching && (
              <Loader2 className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
            )}
            <input
              value={search} onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 200)}
              placeholder="Rechercher une adresse à Sousse..."
              className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none transition-all ${searchInp}`}
            />
            {showSugg && suggestions.length > 0 && (
              <div className={`absolute top-full mt-1 left-0 right-0 border rounded-xl shadow-xl z-[1200] overflow-hidden ${suggMenu}`}>
                {suggestions.map((s, i) => (
                  <button key={i} onMouseDown={() => handleSelectSuggestion(s)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 border-b last:border-0 ${dark ? 'border-slate-700' : 'border-slate-50'} ${suggItem}`}>
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                    <span className="truncate">{s.display_name.split(',').slice(0, 3).join(', ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Dropdown label="Catégorie"      options={CATEGORIES}      value={catFilter}  onChange={setCatFilter}  dark={dark} />
          <Dropdown label="Arrondissement" options={ARRONDISSEMENTS} value={arrFilter}  onChange={setArrFilter}  dark={dark} />
          <Dropdown label="Statut"         options={STATUSES}        value={statFilter} onChange={setStatFilter} dark={dark} />

          <span className={`text-xs font-medium ml-auto hidden sm:block ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            {filtered.length} signalement{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Map ── */}
        <div className="flex-1 relative overflow-hidden">
          <MapContainer center={[35.8245, 10.6346]} zoom={13}
            style={{ width: '100%', height: '100%' }} zoomControl={false}>
            {/* Switch tile layer based on dark mode */}
            <TileLayerSwitch dark={dark} />
            <FlyTo coords={flyTo} />

            {filtered.map(d => {
              const cfg  = getCfg(d.status.toLowerCase())
              const icon = createPin(cfg.color, selected?.id === d.id)
              return (
                <React.Fragment key={d.id}>
                  {heatmap && (
                    <Circle center={[d.latitude, d.longitude]} radius={400}
                      pathOptions={{ color: 'transparent', fillColor: cfg.heatColor, fillOpacity: 0.65 }} />
                  )}
                  <Marker position={[d.latitude, d.longitude]} icon={icon}
                    eventHandlers={{ click: () => { setSelected(d); setFlyTo([d.latitude, d.longitude]) } }} />
                </React.Fragment>
              )
            })}
          </MapContainer>

          {/* ── Pins / Heatmap toggle ── */}
          <div className={`absolute top-3 z-[999] flex items-center gap-2 border rounded-xl px-3 py-2 shadow-md ${overlay}`}
            style={{ right: selected ? '336px' : '16px' }}>
            <Layers className="w-3.5 h-3.5 opacity-50" />
            <span className={`text-xs font-semibold ${togBtn(!heatmap)}`}>Pins</span>
            <button onClick={() => setHeatmap(!heatmap)}
              className={`relative w-10 h-5 rounded-full transition-all ${togTrack(heatmap)}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${heatmap ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className={`text-xs font-semibold ${togBtn(heatmap)}`}>Heatmap</span>
          </div>

          {/* ── Signaler avec photo ── */}
          <div className="absolute top-3 z-[999] left-1/2 -translate-x-1/2">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => e.target.files?.[0] && handlePhotoSelected(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-2 border rounded-full px-4 py-2 shadow-md text-sm font-bold transition-all ${
                dark
                  ? 'bg-slate-900/90 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-blue-500 hover:text-blue-400'
                  : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-[#1557FF] hover:text-[#1557FF]'
              }`}>
              <Camera className="w-4 h-4 text-[#1557FF]" />
              Signaler avec photo
              <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-black text-[#1557FF]">IA</span>
            </button>
          </div>

          {/* ── Legend ── */}
          <div className={`absolute bottom-6 left-4 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border z-[999] ${
            dark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-100'
          }`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2.5 ${legendSub}`}>
              Statut des signalements
            </p>
            {LEGEND.map(item => (
              <div key={item.label} className="flex items-center gap-2 mb-1.5 last:mb-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className={`text-xs font-medium ${legendTx}`}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* ── Zoom + locate ── */}
          <div className="absolute bottom-6 flex flex-col gap-1 z-[999]"
            style={{ right: selected ? '336px' : '16px' }}>
            {[
              { label: '+', action: () => {} },
              { label: '−', action: () => {} },
            ].map(b => (
              <button key={b.label} className={`w-9 h-9 rounded-xl shadow-md border flex items-center justify-center font-bold text-lg transition-all ${
                dark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>{b.label}</button>
            ))}
            <button
              onClick={() => navigator.geolocation?.getCurrentPosition(p => setFlyTo([p.coords.latitude, p.coords.longitude]))}
              className={`w-9 h-9 mt-1 rounded-xl shadow-md border flex items-center justify-center text-[#1557FF] transition-all ${
                dark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}>
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          {/* ── Side panel ── */}
          {selected && <SidePanel decl={selected} onClose={() => setSelected(null)} dark={dark} />}
        </div>
      </div>
    </CitizenLayout>
  )
}

export default MapPage