import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, Search, ChevronDown, MapPin, Camera, Navigation, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CitizenLayout from '../../components/citizen/CitizenLayout'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

// ─── Fix Leaflet icons ────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── 4 statuses ───────────────────────────────────────────────────────────────
// soumise = amber  |  en_cours = blue  |  resolue = green | cloturee = slate
const STATUS_CFG: Record<string, { color: string; label: string; heatColor: string }> = {
  soumise:        { color: '#F59E0B', label: 'Soumise',  heatColor: 'rgba(245,158,11,0.25)' },
  assignee_chef:  { color: '#1557FF', label: 'En cours', heatColor: 'rgba(21,87,255,0.2)'   },
  assignee_agent: { color: '#1557FF', label: 'En cours', heatColor: 'rgba(21,87,255,0.2)'   },
  en_cours:       { color: '#1557FF', label: 'En cours', heatColor: 'rgba(21,87,255,0.2)'   },
  resolue:        { color: '#16a34a', label: 'Résolue',  heatColor: 'rgba(22,163,74,0.2)'   },
  cloturee:       { color: '#475569', label: 'Clôturée', heatColor: 'rgba(71,85,105,0.2)'   },
  refusee_chef:   { color: '#ef4444', label: 'Refusée',  heatColor: 'rgba(239,68,68,0.2)'   },
}

const LEGEND = [
  { color: '#F59E0B', label: 'Soumise'  },
  { color: '#1557FF', label: 'En cours' },
  { color: '#16a34a', label: 'Résolue'  },
  { color: '#475569', label: 'Clôturée' },
]

// ─── Tile layers ──────────────────────────────────────────────────────────────
// Light: CartoDB Voyager  |  Dark: CartoDB Dark Matter (mark-a-spot style)
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTR_LIGHT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
const ATTR_DARK  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

// ─── Hook: sync dark mode from document.documentElement.classList ─────────────
function useDarkMap() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// ─── Reactive TileLayer component ─────────────────────────────────────────────
function DarkAwareTileLayer() {
  return <TileLayer url={TILE_LIGHT} attribution={ATTR_LIGHT} />
}

const CATEGORIES      = ['Toutes catégories', 'Voirie', 'Éclairage', 'Propreté', 'Espaces Verts', 'Réseaux', 'Signalisation']
const ARRONDISSEMENTS = ['Tout Sousse', 'Sousse Ville', 'Sousse Jawhara', 'Sousse Sidi Abdelhamid']
const STATUSES        = ['Tous statuts', 'Soumise', 'En cours', 'Résolue', 'Clôturée']
const TIMELINE_STEPS  = ['Soumise', 'En cours', 'Résolue', 'Clôturée']

const MOCK: any[] = [
  { id:'1', title:'Éclairage défectueux - Avenue de la République', description:'Le lampadaire clignote depuis deux nuits.', category:'Éclairage', status:'en_cours', latitude:35.8270, longitude:10.6370, address:'Avenue de la République, Sousse', created_at:'2026-04-20T21:15:00Z', history:[{changed_at:'2026-04-20T21:15:00Z'},{changed_at:'2026-04-21T09:30:00Z'},null,null] },
  { id:'2', title:'Nid de poule Av. Bourguiba',                    description:'Grand trou dangereux devant le marché.',     category:'Voirie',     status:'soumise',  latitude:35.8256, longitude:10.6346, address:'Av. Habib Bourguiba, Sousse',    created_at:'2026-04-22T10:00:00Z' },
  { id:'3', title:'Déchets non collectés Cité Ettaamir',           description:'Accumulation de déchets depuis 3 jours.',   category:'Propreté',   status:'cloturee', latitude:35.8220, longitude:10.6300, address:'Cité Ettaamir, Sousse',           created_at:'2026-04-18T08:00:00Z', rating:4, rating_comment:'Ramassage fait rapidement, je suis satisfait.', history:[{changed_at:'2026-04-18T08:00:00Z'},{changed_at:'2026-04-19T10:00:00Z'},{changed_at:'2026-04-20T14:00:00Z'},{changed_at:'2026-04-22T09:00:00Z'}] },
  { id:'4', title:'Fuite d\'eau rue Ibn Khaldoun',                  description:'Fuite importante depuis hier matin.',       category:'Réseaux',    status:'cloturee', latitude:35.8240, longitude:10.6420, address:'Rue Ibn Khaldoun, Sousse',        created_at:'2026-04-10T12:00:00Z', history:[{changed_at:'2026-04-10T12:00:00Z'},{changed_at:'2026-04-11T08:00:00Z'},{changed_at:'2026-04-13T10:00:00Z'},{changed_at:'2026-04-15T16:00:00Z'}] },
  { id:'5', title:'Panneau stop cassé rond-point nord',             description:'Stop illisible, dangereux pour les usagers.',category:'Signalisation',status:'soumise',  latitude:35.8300, longitude:10.6310, address:'Rond-point Nord, Sousse',         created_at:'2026-04-25T09:00:00Z' },
  { id:'6', title:'Arbres dangereux Parc de la Ligue Arabe',       description:'Branches menaçant de tomber sur les passants.',category:'Espaces Verts',status:'cloturee',latitude:35.8278, longitude:10.6389, address:'Parc de la Ligue Arabe, Sousse', created_at:'2026-04-05T11:00:00Z', rating:5, rating_comment:'Excellent travail, très professionnel !', history:[{changed_at:'2026-04-05T11:00:00Z'},{changed_at:'2026-04-06T08:00:00Z'},{changed_at:'2026-04-08T10:00:00Z'},{changed_at:'2026-04-10T15:00:00Z'}] },
]

// ─── Pin icon ─────────────────────────────────────────────────────────────────
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

// ─── Fly to ───────────────────────────────────────────────────────────────────
function FlyTo({ coords }: { coords: [number,number] | null }) {
  const map = useMap()
  useEffect(() => { if (coords) map.flyTo(coords, 16, { duration: 1 }) }, [coords])
  return null
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function getStep(status: string) {
  if (status === 'soumise') return 1
  if (['assignee_chef','assignee_agent','en_cours'].includes(status)) return 2
  if (['resolue'].includes(status)) return 3
  if (['cloturee'].includes(status)) return 4
  return 0
}

function Timeline({ status, history }: { status: string; history?: any[] }) {
  const active = getStep(status)
  return (
    <div className="mt-3 space-y-2">
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < active
        const h    = history?.[i]
        return (
          <div key={step} className="flex items-start gap-2.5">
            <div className="flex flex-col items-center">
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5 ${done ? 'bg-[#1557FF] border-[#1557FF]' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`} />
              {i < TIMELINE_STEPS.length-1 && <div className={`w-0.5 h-5 ${i < active-1 ? 'bg-[#1557FF]' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </div>
            <div>
              <p className={`text-xs font-semibold leading-tight ${done ? 'text-[#0A1628] dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}>{step}</p>
              {h?.changed_at && (
                <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
                  {new Date(h.changed_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                  {' · '}
                  {new Date(h.changed_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
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
function SidePanel({ decl, onClose }: { decl: any; onClose: () => void }) {
  const cfg = STATUS_CFG[decl.status] || STATUS_CFG['soumise']
  const isClosed = decl.status === 'resolue' || decl.status === 'cloturee'

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[320px] bg-white dark:bg-slate-900 shadow-2xl z-[1000] flex flex-col border-l border-slate-100 dark:border-slate-800">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{ color: cfg.color, background: `${cfg.color}18` }}>
            {cfg.label}
          </span>
          {decl.category && (
            <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold px-2.5 py-1 rounded-full">{decl.category}</span>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Title + date */}
        <div>
          {decl.created_at && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-1">
              Soumis le {new Date(decl.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}
            </p>
          )}
          <h3 className="font-bold text-[#0A1628] dark:text-slate-100 text-[15px] leading-tight">{decl.title}</h3>
          {decl.address && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{decl.address}
            </p>
          )}
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{decl.description}</p>

        {/* Timeline */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-2">Suivi de l'intervention</p>
          <Timeline status={decl.status} history={decl.history} />
        </div>

        {/* Photo */}
        {decl.photo_url && (
          <img src={decl.photo_url} alt="" className="w-full h-36 object-cover rounded-xl" />
        )}

        {/* ── Citizen evaluation (only for closed and if exists) ── */}
        {isClosed && (decl.rating || decl.rating_comment) && (
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-2">Évaluation du citoyen</p>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-4">
              {decl.rating && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className={`text-lg ${i <= decl.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}>★</span>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{decl.rating}/5</span>
                </div>
              )}
              {decl.rating_comment && (
                <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-amber-100 dark:border-slate-700">
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{decl.rating_comment}"</p>
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
function Dropdown({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v:string)=>void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-[#1557FF] dark:hover:border-blue-500 transition-all min-w-32">
        {value === options[0] ? label : value}
        <ChevronDown className="w-4 h-4 ml-auto" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-[1100] min-w-44 py-1">
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                value===o
                  ? 'text-[#1557FF] dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/30'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}>
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

// ─── Main Map Page ────────────────────────────────────────────────────────────
const MapPage: React.FC = () => {
  const navigate = useNavigate()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [decls,       setDecls]       = useState<any[]>(MOCK)
  const [selected,    setSelected]    = useState<any>(null)
  const [flyTo,       setFlyTo]       = useState<[number,number]|null>(null)

  // Search state
  const [search,      setSearch]      = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching,   setSearching]   = useState(false)
  const [showSugg,    setShowSugg]    = useState(false)
  const searchTimeout                 = useRef<any>(null)

  // Filter state
  const [catFilter,   setCatFilter]   = useState(CATEGORIES[0])
  const [arrFilter,   setArrFilter]   = useState(ARRONDISSEMENTS[0])
  const [statFilter,  setStatFilter]  = useState(STATUSES[0])
  const [heatmap,     setHeatmap]     = useState(false)

  const token = localStorage.getItem('fmc_token')

  useEffect(() => {
    fetch(`${API}/declarations/map`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('API Error')
        return r.json()
      })
      .then(data => { 
        const arr = Array.isArray(data) ? data : (data.declarations || []); 
        setDecls(arr); 
      })
      .catch((err) => {
        console.error('Failed to fetch map declarations:', err);
      })
  }, [])

  // ── Address search with Nominatim geocoding ───────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout(searchTimeout.current)
    if (val.length < 3) { setSuggestions([]); setShowSugg(false); return }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(
          `${API}/public/geocode/forward?q=${encodeURIComponent(val + ' Sousse Tunisie')}`
        )
        const data: Suggestion[] = await res.json()
        setSuggestions(data)
        setShowSugg(data.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  const handleSelectSuggestion = (s: Suggestion) => {
    setSearch(s.display_name.split(',').slice(0,2).join(','))
    setFlyTo([parseFloat(s.lat), parseFloat(s.lon)])
    setShowSugg(false)
    setSuggestions([])
  }

  // ── Signaler avec photo ───────────────────────────────────────────────────
  const handlePhotoSelected = (file: File) => {
    // Store photo in sessionStorage as base64 so NouveauSignalement can pick it up
    const reader = new FileReader()
    reader.onload = e => {
      const b64 = e.target?.result as string
      sessionStorage.setItem('map_photo_b64',  b64)
      sessionStorage.setItem('map_photo_name', file.name)
      sessionStorage.setItem('map_photo_type', file.type)
      
      // Also store location if possible (using map center if flyTo not set)
      const center = flyTo || [35.8245, 10.6346]
      sessionStorage.setItem('map_photo_lat', String(center[0]))
      sessionStorage.setItem('map_photo_lng', String(center[1]))
      
      navigate('/nouveau-signalement?from=map')
    }
    reader.readAsDataURL(file)
  }

  const filtered = decls.filter(d => {
    if (!d || !d.status) return false;
    
    // Normalize status to lowercase
    const normalizedStatus = String(d.status).toLowerCase();
    
    // Check if it's one of our allowed status groups
    const cfg = STATUS_CFG[normalizedStatus];
    if (!cfg) return false;

    // Filters
    const matchCat  = catFilter  === CATEGORIES[0]  || d.category === catFilter;
    const matchStat = statFilter === STATUSES[0]    || cfg.label === statFilter;
    
    // Notice: declarations from db might use delegation_id. If arrondissement was used, we match it if it exists.
    // For now we don't strictly hide if arrFilter is set, since DB doesn't have an 'arrondissement' column directly.
    // But if d.arrondissement exists, we respect it.
    const matchArr  = arrFilter === ARRONDISSEMENTS[0] || !d.arrondissement || d.arrondissement === arrFilter;

    // Must have coordinates
    const hasCoords = d.latitude !== null && d.latitude !== undefined && d.longitude !== null && d.longitude !== undefined;
    
    return matchCat && matchStat && matchArr && hasCoords;
  })

  const handlePin = (d: any) => { setSelected(d); setFlyTo([d.latitude, d.longitude]) }


  return (
    <CitizenLayout>
      <style dangerouslySetInnerHTML={{ __html: `
        .dark .leaflet-tile-container img {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) !important;
        }
        .dark .leaflet-container {
          background: #0f172a !important;
        }
        .dark .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.8) !important;
          color: #94a3b8 !important;
        }
        .dark .leaflet-control-attribution a {
          color: #3b82f6 !important;
        }
        /* Dark mode zoom and control buttons styling */
        .dark .leaflet-bar a {
          background-color: #1e293b !important;
          border-bottom: 1px solid #334155 !important;
          color: #f1f5f9 !important;
        }
        .dark .leaflet-bar a:hover {
          background-color: #334155 !important;
        }
      `}} />
      <div className="h-[calc(100vh-64px)] flex flex-col">

        {/* ── Filter bar ── */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-3 z-10 shadow-sm flex-wrap">

          {/* Address search with autocomplete */}
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 z-10" />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 animate-spin" />
            )}
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 200)}
              placeholder="Rechercher une adresse à Sousse..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#1557FF] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all"
            />
            {/* Autocomplete dropdown */}
            {showSugg && suggestions.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[1200] overflow-hidden">
                {suggestions.map((s, i) => (
                  <button key={i}
                    onMouseDown={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-[#1557FF] dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 border-b border-slate-50 dark:border-slate-700 last:border-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <span className="truncate">{s.display_name.split(',').slice(0,3).join(', ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Dropdown label="Catégorie"      options={CATEGORIES}      value={catFilter}  onChange={setCatFilter}  />
          <Dropdown label="Arrondissement" options={ARRONDISSEMENTS} value={arrFilter}  onChange={setArrFilter}  />
          <Dropdown label="Statut"         options={STATUSES}        value={statFilter} onChange={setStatFilter} />

          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-auto hidden sm:block">
            {filtered.length} signalement{filtered.length!==1?'s':''}
          </span>
        </div>

        {/* ── Map ── */}
        <div className="flex-1 relative overflow-hidden">
          <MapContainer center={[35.8245, 10.6346]} zoom={13}
            style={{ width:'100%', height:'100%' }} zoomControl={false}>
            <DarkAwareTileLayer />
            <FlyTo coords={flyTo} />

            {filtered.map(d => {
              const normalizedStatus = String(d.status).toLowerCase();
              const cfg  = STATUS_CFG[normalizedStatus] || STATUS_CFG['soumise']
              const icon = createPin(cfg.color, selected?.id === d.id)
              return (
                <React.Fragment key={d.id}>
                  {heatmap && (
                    <Circle center={[d.latitude, d.longitude]} radius={400}
                      pathOptions={{ color:'transparent', fillColor:cfg.heatColor, fillOpacity:0.6 }} />
                  )}
                  <Marker position={[d.latitude, d.longitude]} icon={icon}
                    eventHandlers={{ click: () => handlePin(d) }} />
                </React.Fragment>
              )
            })}
          </MapContainer>

          {/* Pins / Heatmap toggle */}
          <div className="absolute top-3 z-[999] flex items-center gap-2 bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-md"
            style={{ right: selected ? '336px' : '16px' }}>
            <span className={`text-xs font-semibold ${!heatmap ? 'text-[#1557FF]' : 'text-slate-400 dark:text-slate-500'}`}>Pins</span>
            <button onClick={() => setHeatmap(!heatmap)}
              className={`relative w-10 h-5 rounded-full transition-all ${heatmap ? 'bg-[#1557FF]' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${heatmap ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className={`text-xs font-semibold ${heatmap ? 'text-[#1557FF]' : 'text-slate-400 dark:text-slate-500'}`}>Heatmap</span>
          </div>

          {/* ── Signaler avec photo IA button ── */}
          <div className="absolute top-3 z-[999] left-1/2 -translate-x-1/2">
            {/* Hidden file input */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => e.target.files?.[0] && handlePhotoSelected(e.target.files[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 shadow-md text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:border-[#1557FF] dark:hover:border-blue-500 hover:text-[#1557FF] dark:hover:text-blue-400 transition-all">
              <Camera className="w-4 h-4 text-[#1557FF]" />
              Signaler avec photo
              <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-[10px] font-black text-[#1557FF] dark:text-blue-400">IA</span>
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-6 left-4 bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-slate-100 dark:border-slate-800 z-[999]">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Statut des signalements</p>
            {LEGEND.map(item => (
              <div key={item.label} className="flex items-center gap-2 mb-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Zoom + locate */}
          <div className="absolute bottom-6 flex flex-col gap-1 z-[999]"
            style={{ right: selected ? '336px' : '16px' }}>
            <button className="w-9 h-9 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 text-lg">+</button>
            <button className="w-9 h-9 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 text-lg">−</button>
            <button
              onClick={() => {
                navigator.geolocation?.getCurrentPosition(p => setFlyTo([p.coords.latitude, p.coords.longitude]))
              }}
              className="w-9 h-9 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#1557FF] dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700 mt-1">
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          {selected && <SidePanel decl={selected} onClose={() => setSelected(null)} />}
        </div>
      </div>
    </CitizenLayout>
  )
}

export default MapPage