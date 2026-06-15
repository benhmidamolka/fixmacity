import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, Rectangle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft, ArrowRight, MapPin, Camera, CheckCircle, Copy, AlertCircle, Crosshair, X } from 'lucide-react'
import toast from 'react-hot-toast'
import CitizenLayout from '../../components/citizen/CitizenLayout'
import { analyzeDeclarationPhoto } from '../../services/Geminivision'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5005/api'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CATEGORIES = [
  { id: 'Voirie',        emoji: '🚧', label: 'Voirie',         sub: 'Trous, pavés'     },
  { id: 'Éclairage',     emoji: '💡', label: 'Éclairage',      sub: 'Panne, cassé'     },
  { id: 'Espaces Verts', emoji: '🌳', label: 'Espaces verts',  sub: 'Arbres, parcs'    },
  { id: 'Propreté',      emoji: '🧹', label: 'Propreté',       sub: 'Déchets, tags'    },
  { id: 'Réseaux',       emoji: '🔧', label: 'Assainissement', sub: 'Fuites, égouts'   },
  { id: 'Signalisation', emoji: '🛑', label: 'Signalisation',  sub: 'Panneaux, feux'   },
  { id: 'Administratif', emoji: '🏢', label: 'Bâtiments',      sub: 'Publics, murs'    },
  { id: 'Transport',     emoji: '🚌', label: 'Transport',      sub: 'Bus, arrêts'      },
  { id: 'Autre',         emoji: '❓', label: 'Autre',          sub: 'Inclassable'      },
]

const URGENCY = [
  { id: 'faible', label: 'Faible' },
  { id: 'moyen',  label: 'Moyen'  },
  { id: 'urgent', label: 'Urgent' },
]

// Geographic bounding boxes for each of the 4 arrondissements
// [minLat, maxLat, minLng, maxLng]
const ARRONDISSEMENT_BOUNDS_BY_NAME: Record<string, [number, number, number, number]> = {
  'Sousse Médina':          [35.817, 35.835, 10.625, 10.650],
  'Sousse Riadh':           [35.775, 35.815, 10.600, 10.640],
  'Sousse Nord':            [35.835, 35.870, 10.615, 10.660], // Jawhara
  'Sousse Sud':             [35.800, 35.840, 10.595, 10.632], // Sidi Abdelhamid
}

// Returns the arrondissement id if the point is inside, null otherwise
function detectArrondissement(lat: number, lng: number, delegations: any[]): string | null {
  for (const [name, [minLat, maxLat, minLng, maxLng]] of Object.entries(ARRONDISSEMENT_BOUNDS_BY_NAME)) {
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      const del = delegations.find(d => d.name === name)
      return del ? del.id : null
    }
  }
  return null
}

// The overall valid zone bounding box (union of all 4 arrondissements)
const SOUSSE_BBOX = { minLat: 35.775, maxLat: 35.870, minLng: 10.595, maxLng: 10.660 }

function isInSousseMunicipality(lat: number, lng: number): boolean {
  return (
    lat >= SOUSSE_BBOX.minLat && lat <= SOUSSE_BBOX.maxLat &&
    lng >= SOUSSE_BBOX.minLng && lng <= SOUSSE_BBOX.maxLng
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
          style={{ background: i < step ? '#1557FF' : '#e2e8f0' }} />
      ))}
    </div>
  )
}

// ─── Map click handler ────────────────────────────────────────────────────────
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng) } })
  return null
}

// ─── Out of Bounds Modal ────────────────────────────────────────────────────────
function OutOfBoundsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center"
        onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-[#0A1628] dark:text-white mb-2">Localisation non valide</h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
          Cette localisation n'appartient pas aux arrondissements de la <strong>Municipalité de Sousse</strong>. 
          Veuillez sélectionner un emplacement valide (Sousse Médina, Riadh, Jawhara, ou Sidi Abdelhamid).
        </p>
        <button onClick={onClose}
          className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
          style={{ background: '#1557FF' }}>
          J'ai compris
        </button>
      </div>
    </div>
  )
}

// ─── Change Map View ──────────────────────────────────────────────────────────
function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMapEvents({})
  React.useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

// ─── STEP 1: Location ─────────────────────────────────────────────────────────
function Step1({ data, onChange, onNext, delegations }: any) {
  const [loading, setLoading] = useState(false)
  const [outOfBoundsMsg, setOutOfBoundsMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const applyLocation = (lat: number, lng: number, displayName: string) => {
    // Strict bbox validation — must be inside one of the 4 arrondissements
    if (!isInSousseMunicipality(lat, lng)) {
      setOutOfBoundsMsg('Ce lieu est en dehors de la municipalité de Sousse.')
      return false
    }
    const detectedArr = detectArrondissement(lat, lng, delegations)
    if (!detectedArr) {
      setOutOfBoundsMsg(
        'Ce lieu n\'est pas couvert par l\'un des 4 arrondissements municipaux (Médina, Riadh, Nord, Sud).'
      )
      return false
    }
    setOutOfBoundsMsg(null)
    const shortAddr = displayName.split(',').slice(0, 3).join(',')
    onChange({ latitude: lat, longitude: lng, address: shortAddr, delegation_id: detectedArr })
    setSearchQuery(shortAddr)
    return true
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoading(true)
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1&accept-language=fr`
      )
      const d = await r.json()
      if (!d.display_name) console.warn('[Nominatim] No display_name returned:', d)
      const formattedAddress = d.display_name
        ? d.display_name.split(',').slice(0, 3).join(',').trim()
        : `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      applyLocation(lat, lng, formattedAddress)
    } catch (err) {
      console.warn('[Nominatim] reverseGeocode failed:', err)
      applyLocation(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim().length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    try {
      // We append "Sousse" to ensure we search specifically in Sousse
      // and prevent issues with generic names like "khzema" returning 0 results.
      const words = query.trim().split(/\s+/)
      const normalizedQuery = words.join(' ') + ' Sousse'

      // Search within the Sousse municipality viewbox (lon_min,lat_max,lon_max,lat_min)
      const viewbox = `${SOUSSE_BBOX.minLng},${SOUSSE_BBOX.maxLat},${SOUSSE_BBOX.maxLng},${SOUSSE_BBOX.minLat}`
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalizedQuery)}&format=json&limit=10&accept-language=fr&countrycodes=tn&viewbox=${viewbox}&bounded=0`

      const r = await fetch(url)
      let results = await r.json()

      // Filter to results within (or very near) our bbox
      const filtered = results.filter((s: any) => {
        const lat = parseFloat(s.lat)
        const lng = parseFloat(s.lon)
        // Accept results within a slightly expanded bbox for suggestions
        return (
          lat >= SOUSSE_BBOX.minLat - 0.02 && lat <= SOUSSE_BBOX.maxLat + 0.02 &&
          lng >= SOUSSE_BBOX.minLng - 0.02 && lng <= SOUSSE_BBOX.maxLng + 0.02
        )
      })

      // Dedup by display_name base
      const deduped: any[] = []
      const seen = new Set()
      for (const s of filtered) {
        const base = s.display_name.split(',').slice(0, 2).join(',')
        if (!seen.has(base)) {
          seen.add(base)
          deduped.push(s)
        }
      }

      setSuggestions(deduped.length > 0 ? deduped.slice(0, 5) : results.slice(0, 3))
      setShowSuggestions(true)
    } catch (e) {
      console.error('Search error', e)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const selectSuggestion = (s: any) => {
    const lat = parseFloat(s.lat)
    const lng = parseFloat(s.lon)
    applyLocation(lat, lng, s.display_name)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      p => reverseGeocode(p.coords.latitude, p.coords.longitude),
      () => setLoading(false)
    )
  }

  const handleNext = () => {
    if (!data.latitude || !data.delegation_id) {
      toast.error("L'information [Localisation] est manquante")
      return
    }
    onNext()
  }

  const detectedName = delegations.find((d: any) => d.id === data.delegation_id)?.name

  return (
    <div className="flex flex-col gap-0">

      <div className="bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-50 dark:border-slate-800 border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-400 font-medium">Étape 1 sur 4 · Localisation</p>
        <p className="text-sm font-semibold text-[#0A1628] dark:text-white mt-0.5">Où se trouve le problème ?</p>

        {/* Search Bar */}
        <div className="relative mt-3">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Ex: rue Ibn Khaldoun, Bourguiba, Medina..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-[#1557FF] transition-all"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-b border-slate-50 dark:border-slate-800/20 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 z-[1001] mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden">
              {suggestions.length > 0 ? (
                suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectSuggestion(s)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 border-b border-slate-50 dark:border-slate-800 last:border-0 flex items-start gap-3 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-[#1557FF] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-[#0A1628] dark:text-white">{s.display_name.split(',').slice(0,2).join(',')}</p>
                      <p className="text-[11px] text-slate-400 truncate">{s.display_name.split(',').slice(2,4).join(',')}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Aucun résultat dans les arrondissements de Sousse.</p>
                  <p className="text-xs text-slate-400 mt-1">Essayez : avenue, rue, quartier, place...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Out of bounds error */}
        {outOfBoundsMsg && (
          <div className="mt-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <p className="text-xs text-red-600 font-medium">{outOfBoundsMsg}</p>
          </div>
        )}
      </div>

      <div className="relative h-[340px]">
        <MapContainer center={[data.latitude || 35.8245, data.longitude || 10.6346]} zoom={13}
          style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {/* Arrondissements highlighting */}
          {Object.entries(ARRONDISSEMENT_BOUNDS_BY_NAME).map(([name, [minLat, maxLat, minLng, maxLng]]) => {
            const bounds: [[number, number], [number, number]] = [
              [minLat, minLng],
              [maxLat, maxLng]
            ];
            
            // Assign different colors based on name
            let color = '#3b82f6';
            if (name === 'Sousse Médina') color = '#ef4444';
            if (name === 'Sousse Riadh') color = '#eab308';
            if (name === 'Sousse Nord') color = '#22c55e';
            if (name === 'Sousse Sud') color = '#a855f7';

            return (
              <Rectangle 
                key={name} 
                bounds={bounds} 
                pathOptions={{ color, weight: 2, fillOpacity: 0.1 }}
              />
            );
          })}

          <MapClickHandler onPick={reverseGeocode} />
          {data.latitude && (
            <>
              <Marker position={[data.latitude, data.longitude]} />
              <ChangeMapView center={[data.latitude, data.longitude]} />
            </>
          )}
        </MapContainer>

        <button onClick={useMyLocation}
          className="absolute top-3 left-3 z-[999] flex items-center gap-2 bg-white dark:bg-slate-900/95 text-[#1557FF] font-bold text-[11px] px-3 py-2 rounded-full shadow-md border border-white hover:bg-blue-50 transition-all">
          <Crosshair className="w-3 h-3" /> Ma position
        </button>

        {!data.latitude && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[999] bg-white dark:bg-slate-900/90 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-xs font-medium px-4 py-2 rounded-full shadow-md border border-slate-100 dark:border-slate-800">
            🗺️ Cliquez sur la carte ou recherchez une adresse
          </div>
        )}

        {showSuggestions && (
          <div className="fixed inset-0 z-[1000]" onClick={() => setShowSuggestions(false)} />
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
        {data.address && (
          <div className="flex items-center gap-3 bg-blue-50/60 rounded-xl px-3 py-3 border border-b border-slate-50 dark:border-slate-800/60">
            <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <MapPin className="w-4 h-4 text-[#1557FF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Lieu sélectionné</p>
              <p className="text-sm font-semibold text-[#0A1628] dark:text-white truncate">{data.address}</p>
              {detectedName && (
                <p className="text-[11px] text-green-600 font-semibold mt-0.5">
                  ✓ {detectedName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* If arrondissement not auto-detected, show manual selector */}
        {!detectedName && (
          <select value={data.delegation_id || ''} onChange={e => onChange({ delegation_id: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm text-[#0A1628] dark:text-white outline-none focus:border-[#1557FF] transition-all appearance-none cursor-pointer">
            <option value="" disabled>Sélectionner l'arrondissement concerné *</option>
            {delegations.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}

        <button onClick={handleNext} disabled={!data.latitude || !data.delegation_id}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-sm transition-all shadow-lg shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#1557FF' }}>
          Confirmer cet emplacement <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}


// ─── STEP 2: Category ─────────────────────────────────────────────────────────
function Step2({ data, onChange, onNext, onBack }: any) {
  const [loading, setLoading] = useState(false)
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [showDuplicates, setShowDuplicates] = useState(false)
  const navigate = useNavigate()

  const handleNext = async () => {
    if (!data.category) {
      toast.error("L'information [Catégorie] est manquante")
      return
    }
    
    // Check for nearby duplicates
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const r = await fetch(`${API}/declarations/nearby?latitude=${data.latitude}&longitude=${data.longitude}&category=${data.category}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (r.ok) {
        const nearby = await r.json()
        if (nearby && nearby.length > 0) {
          setDuplicates(nearby)
          setShowDuplicates(true)
          setLoading(false)
          return
        }
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
    onNext()
  }

  const handleSupport = async (declId: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/declarations/${declId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        toast.success("Votre vote de soutien a bien été enregistré !")
        navigate('/citizen/map') // or dashboard
      } else {
        toast.error("Erreur lors du vote.")
      }
    } catch {
      toast.error("Erreur serveur.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      {showDuplicates && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl p-6 relative flex flex-col max-h-[80vh]">
            <button onClick={() => setShowDuplicates(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-300">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0A1628] dark:text-white">Ce problème a déjà été signalé</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Un problème identique existe déjà à cet emplacement exact. Souhaitez-vous le soutenir pour augmenter sa priorité ?</p>
              </div>
            </div>
            
            <div className="overflow-y-auto pr-1 mb-4 space-y-3">
              {duplicates.map(d => (
                <div key={d.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-slate-800">{d.title}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">{d.category}</span>
                  </div>
                  <button onClick={() => handleSupport(d.id)}
                    className="w-full py-2 bg-white dark:bg-slate-900 border border-[#1557FF] text-[#1557FF] text-xs font-bold rounded-lg hover:bg-blue-50 transition-all">
                    👍 Soutenir cette déclaration
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto">
              <button onClick={() => { setShowDuplicates(false); onNext(); }}
                className="w-full py-3 bg-[#0A1628] text-white text-sm font-bold rounded-xl hover:bg-[#152a4d] transition-all">
                Non, créer une nouvelle déclaration
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold text-[#0A1628] dark:text-white mb-1">De quel type de problème s'agit-il ?</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Choisissez la catégorie la plus proche</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {CATEGORIES.map(cat => (
          <button key={cat.id} type="button" onClick={() => onChange({ category: cat.id })}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
              data.category === cat.id
                ? 'border-[#1557FF] bg-blue-50 text-[#1557FF]'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}>
            <span className="text-2xl">{cat.emoji}</span>
            <span className="text-xs font-bold leading-tight text-center">{cat.label}</span>
            <span className="text-[10px] text-slate-400 leading-tight text-center">{cat.sub}</span>
          </button>
        ))}
      </div>
      <div className="mb-6">
        <p className="text-sm font-bold text-[#0A1628] dark:text-white mb-3">Niveau d'urgence</p>
        <div className="flex gap-2">
          {URGENCY.map(u => (
            <button key={u.id} type="button" onClick={() => onChange({ urgency: u.id })}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                data.urgency === u.id
                  ? 'border-[#F59E0B] bg-amber-50 text-amber-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
              }`}>
              {u.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} disabled={loading}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50">
          <ArrowLeft className="w-4 h-4" /> Précédent
        </button>
        <button onClick={handleNext} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50"
          style={{ background: '#1557FF' }}>
          {loading ? 'Vérification...' : 'Continuer'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Similar Declarations Modal (Exception 3) ──────────────────────────────────
function SimilarModal({ data, onIgnore, onVote }: { data: any; onIgnore: () => void; onVote: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <Copy className="w-7 h-7 text-[#1557FF]" />
        </div>
        <h3 className="text-lg font-bold text-[#0A1628] dark:text-white mb-2">Signalements similaires trouvés</h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
          Un signalement très similaire a déjà été soumis récemment à proximité. Pour une prise en charge plus rapide, vous pouvez simplement voter pour celui-ci.
        </p>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-left border border-slate-100 dark:border-slate-800 mb-6">
          <p className="text-xs font-bold text-[#1557FF] mb-1">{data.category || 'Catégorie'}</p>
          <p className="text-sm font-semibold text-[#0A1628] dark:text-white mb-1">{data.title || 'Problème signalé'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{data.address || 'Adresse proche'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onIgnore}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Créer quand même
          </button>
          <button onClick={() => { onVote(); navigate('/mes-signalements') }}
            className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all"
            style={{ background: '#1557FF' }}>
            Voter pour ceci
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── STEP 3: Details with AI photo analysis ───────────────────────────────────
function Step3({ data, onChange, onNext, onBack, autoFile }: any) {
  const [preview,   setPreview]   = useState<string | null>(null)
  const [dragging,  setDragging]  = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiDone,    setAiDone]    = useState(false)
  const [showSimilar, setShowSimilar] = useState(false)
  const autoTriggered = useRef(false)

  const handleFile = async (file: File) => {
    onChange({ photo: file })
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setAnalyzing(true)
    setAiDone(false)
    try {
      // Pass GPS coordinates for contextual AI analysis (sensitive area detection)
      const result = await analyzeDeclarationPhoto(file, {
        latitude:  data.latitude  || null,
        longitude: data.longitude || null,
        category:  data.category  || null,
      })
      onChange({
        photo:       file,
        title:       result.title || data.title || '',
        description: result.description || data.description || '',
        category:    result.category || data.category || '',
        urgency:     result.urgency,
        hazard:      result.hazard,
        hazard_note: result.hazard_note,
        // AI enrichment fields
        ai_analyzed:          true,
        ai_source:            result.source,
        ai_confidence:        Math.round((result.confidence || 0.5) * 100),
        ai_reasoning:         result.hazard_note || result.description || '',
        ai_danger_score:      result.danger_score,
        ai_visible_issues:    result.visible_issues,
        near_sensitive_area:  result.near_sensitive_area,
        sensitive_area_impact: result.sensitive_area_impact,
      })
      setAiDone(true)
      if (result.source === 'heuristic_fallback') {
        toast('IA indisponible — priorité calculée par heuristique.', { icon: '⚙️' })
      }
    } catch {
      // fail silently — user fills manually
    } finally {
      setAnalyzing(false)
    }
  }

  // Fast-lane: if the map button provided a photo, auto-trigger AI analysis once
  useEffect(() => {
    if (autoFile && !autoTriggered.current) {
      autoTriggered.current = true
      handleFile(autoFile)
    }
  }, [autoFile])

  const handleNext = async () => {
    if (!data.title || !data.description) {
      toast.error("L'information [Titre / Description] est manquante")
      return
    }
    
    // Replace Math.random() with real fetch to /api/declarations/nearby
    if (!showSimilar) {
      try {
        const token = localStorage.getItem('fmc_token')
        const res = await fetch(`${API}/declarations/nearby?lat=${data.latitude}&lng=${data.longitude}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const result = await res.json()
          if (result.declarations && result.declarations.length > 0) {
            setShowSimilar(true)
            return
          }
        }
      } catch (err) {
        console.error("Error fetching nearby declarations", err)
      }
    }
    
    onNext()
  }

  return (
    <div className="p-6">
      {showSimilar && <SimilarModal data={data} onIgnore={() => { setShowSimilar(false); onNext(); }} onVote={() => { toast.success("Vote enregistré !"); }} />}
      
      <h2 className="text-2xl font-bold text-[#0A1628] dark:text-white mb-1">Décrivez le problème</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Ajoutez une photo (optionnel) pour que l'IA remplisse automatiquement les champs.</p>

      <div className="space-y-5">
        {/* Photo upload — first so AI fills fields below */}
        <div>
          <label className="text-sm font-bold text-[#0A1628] dark:text-white block mb-2">
            Photo du problème <span className="text-slate-400 font-normal text-xs">(Optionnel)</span>
            <span className="ml-2 text-[#1557FF] text-xs font-semibold">✨ Analyse IA automatique</span>
          </label>
          {preview ? (
            <div className="relative rounded-xl overflow-hidden h-40">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              {analyzing && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-white text-xs font-bold">Analyse IA en cours...</p>
                </div>
              )}
              {aiDone && !analyzing && (
                <div className="absolute top-2 left-2 bg-[#1557FF] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                  ✨ Champs remplis automatiquement !
                </div>
              )}
              <button onClick={() => { setPreview(null); onChange({ photo: null }); setAiDone(false) }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> 1 photo ajoutée ✓
              </div>
            </div>
          ) : (
            <label
              className={`flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                dragging ? 'border-[#1557FF] bg-blue-50' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-[#1557FF] hover:bg-blue-50'
              }`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]) }}>
              <input type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Camera className="w-5 h-5 text-[#1557FF]" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Glissez une photo ici</p>
              <p className="text-xs text-slate-400 mt-0.5">ou cliquez pour parcourir</p>
              <p className="text-xs text-[#1557FF] font-semibold mt-2">✨ L'IA remplira les champs automatiquement</p>
            </label>
          )}
        </div>

        {/* Title */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-sm font-bold text-[#0A1628] dark:text-white">
              Titre du signalement *
              {aiDone && <span className="ml-2 text-[10px] text-[#1557FF] font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">IA</span>}
            </label>
            <span className="text-xs text-slate-400">{data.title?.length || 0}/100</span>
          </div>
          <input value={data.title || ''} onChange={e => onChange({ title: e.target.value.slice(0, 100) })}
            placeholder={analyzing ? 'Analyse en cours...' : 'Ex: Nid de poule profond avenue Habib Bourguiba'}
            disabled={analyzing}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#0A1628] dark:text-white placeholder-slate-400 outline-none focus:border-[#1557FF] transition-all disabled:opacity-50" />
        </div>

        {/* Description */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-sm font-bold text-[#0A1628] dark:text-white">
              Description *
              {aiDone && <span className="ml-2 text-[10px] text-[#1557FF] font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">IA</span>}
            </label>
            <span className="text-xs text-slate-400">{data.description?.length || 0}/500</span>
          </div>
          <textarea value={data.description || ''} onChange={e => onChange({ description: e.target.value.slice(0, 500) })}
            placeholder={analyzing ? 'Analyse en cours...' : "Donnez plus de détails sur l'urgence ou la situation..."}
            rows={4} disabled={analyzing}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-[#0A1628] dark:text-white placeholder-slate-400 outline-none focus:border-[#1557FF] transition-all resize-none disabled:opacity-50" />
          <p className="text-xs text-[#1557FF] mt-1 flex items-center gap-1">
            <span>📍</span> Conseil : mentionnez si c'est dangereux
          </p>
        </div>

        {/* Critical Infrastructure Checkbox */}
        <div>
          <label className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <div className="pt-0.5">
              <input type="checkbox" className="w-4 h-4 rounded text-[#1557FF] focus:ring-[#1557FF]" 
                checked={data.has_critical_infrastructure || false}
                onChange={e => onChange({ has_critical_infrastructure: e.target.checked, sensitive_type: e.target.checked ? 'ecole' : '' })} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0A1628] dark:text-white">Lieu sensible à proximité ?</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cochez cette case si le problème se trouve près d'une école, d'un hôpital, d'une clinique ou d'une mosquée.</p>
            </div>
          </label>
          
          {data.has_critical_infrastructure && (
            <div className="mt-3 ml-11">
              <label className="text-sm font-bold text-[#0A1628] dark:text-white block mb-1.5">Précisez le type de lieu :</label>
              <select 
                value={data.sensitive_type || 'ecole'} 
                onChange={e => onChange({ sensitive_type: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-[#0A1628] dark:text-white outline-none focus:border-[#1557FF] transition-all"
              >
                <option value="ecole">École / Lycée / Université</option>
                <option value="hopital">Hôpital / Clinique / Centre de santé</option>
                <option value="mosquee">Mosquée</option>
                <option value="administration">Administration Publique</option>
                <option value="autre">Autre lieu sensible</option>
              </select>
            </div>
          )}
        </div>

        {/* Hazard warning */}
        {data.hazard && data.hazard_note && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
            <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-0.5">Danger détecté par l'IA</p>
              <p className="text-sm text-red-700">{data.hazard_note}</p>
            </div>
          </div>
        )}

        {/* Sensitive area detected by AI */}
        {data.near_sensitive_area && (
          <div className="bg-blue-50 border border-b border-slate-50 dark:border-slate-800 border-blue-200 rounded-xl p-3 flex items-start gap-3">
            <span className="text-blue-500 text-lg flex-shrink-0">🏥</span>
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-0.5">Zone sensible détectée</p>
              <p className="text-sm text-blue-700">{data.sensitive_area_impact || 'Ce signalement est situé à proximité d\'un lieu sensible (école, hôpital…). La priorité a été ajustée automatiquement.'}</p>
            </div>
          </div>
        )}

        {/* Tip */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-700">Bon à savoir</p>
            <p className="text-xs text-amber-600 mt-0.5">Une photo claire permet une intervention jusqu'à 3× plus rapide. L'IA analyse automatiquement la catégorie et l'urgence.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          <ArrowLeft className="w-4 h-4" /> Précédent
        </button>
        <button onClick={handleNext} disabled={analyzing}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition-all"
          style={{ background: '#1557FF' }}>
          {analyzing ? 'Analyse en cours...' : <>Presque fini ! <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  )
}

// ─── STEP 4: Review ───────────────────────────────────────────────────────────
function Step4({ data, onSubmit, onBack, loading, delegations }: any) {
  const catInfo = CATEGORIES.find(c => c.id === data.category)
  
  const handleFinalSubmit = () => {
    // Final overall check (Exception 1)
    if (!data.title || !data.category || !data.latitude) {
      toast.error(`L'information [${!data.title ? 'Titre' : !data.category ? 'Catégorie' : 'Localisation'}] est manquante`)
      return
    }
    onSubmit()
  }

  return (
    <div className="p-6">
      <ProgressBar step={4} total={4} />
      <p className="text-right text-xs text-slate-400 mt-1 mb-4">Étape 4 sur 4</p>
      <h2 className="text-2xl font-bold text-[#0A1628] dark:text-white mb-1">Vérifiez votre signalement</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Assurez-vous que toutes les informations sont correctes avant l'envoi.</p>
      <div className="space-y-3 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-[#1557FF] uppercase tracking-wider flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3" /> Localisation
          </p>
          <p className="text-sm font-semibold text-[#0A1628] dark:text-white">{data.address}</p>
          <p className="text-xs text-slate-400 mt-0.5">{delegations.find((d: any) => d.id === data.delegation_id)?.name}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-[#1557FF] uppercase tracking-wider mb-2">Catégorie & urgence</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full">
              {catInfo?.emoji} {catInfo?.label}
            </span>
            {data.urgency && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">
                ❕ Urgence {data.urgency.charAt(0).toUpperCase() + data.urgency.slice(1)}
              </span>
            )}
            {data.hazard && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200">
                ⚠️ Dangereux
              </span>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-[#1557FF] uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm font-semibold text-[#0A1628] dark:text-white mb-1">{data.title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">{data.description}</p>
        </div>
        {data.photo && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-[#1557FF] uppercase tracking-wider mb-2">
              <Camera className="w-3 h-3 inline mr-1" /> Photo
            </p>
            <div className="flex items-center gap-3">
              <img src={URL.createObjectURL(data.photo)} alt="" className="w-12 h-12 rounded-xl object-cover" />
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> 1 photo ajoutée ✓
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          <ArrowLeft className="w-4 h-4" /> Modifier
        </button>
        <button onClick={handleFinalSubmit} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 transition-all"
          style={{ background: '#1557FF' }}>
          {loading
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><span>🚀</span> Envoyer mon signalement</>}
        </button>
      </div>
    </div>
  )
}

// ─── Success ──────────────────────────────────────────────────────────────────
function SuccessScreen({ ref_citoyen, onNew }: { ref_citoyen: string; onNew: () => void }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(ref_citoyen); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-[#1557FF]" />
      </div>
      <h2 className="text-2xl font-bold text-[#0A1628] dark:text-white mb-2">Signalement envoyé ! 🎉</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-xs">
        Merci pour votre contribution à Sousse ! Votre signalement a été transmis aux services techniques municipaux.
      </p>
      <div className="w-full max-w-sm bg-blue-50 border border-b border-slate-50 dark:border-slate-800 border-blue-100 rounded-2xl p-5 mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Référence du ticket</p>
        <p className="text-2xl font-extrabold text-[#1557FF] font-mono mb-3">{ref_citoyen}</p>
        <button onClick={copy} className="flex items-center gap-2 mx-auto text-sm font-semibold text-[#1557FF] hover:text-blue-800 transition-colors">
          <Copy className="w-4 h-4" /> {copied ? 'Copié !' : 'Copier la référence'}
        </button>
      </div>
      <div className="w-full max-w-sm flex items-center justify-between px-4 mb-8">
        {['Soumis', 'En traitement', 'Résolu'].map((step, i) => (
          <div key={step} className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${i === 0 ? 'bg-[#1557FF] border-[#1557FF]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
              {i === 0 ? <CheckCircle className="w-4 h-4 text-white" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
            </div>
            <p className={`text-[11px] font-semibold ${i === 0 ? 'text-[#1557FF]' : 'text-slate-400'}`}>{step}</p>
          </div>
        ))}
      </div>
      <div className="w-full max-w-sm bg-green-50 border border-green-100 rounded-xl p-3 flex items-start gap-3 mb-8">
        <span className="text-green-600">📧</span>
        <p className="text-xs text-green-700 text-left">Vous recevrez une notification par email dès qu'un agent prendra en charge votre demande.</p>
      </div>
      <div className="flex gap-3 w-full max-w-sm">
        <button onClick={() => navigate('/mes-signalements')}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm"
          style={{ background: '#1557FF' }}>
          Suivre mon signalement
        </button>
        <button onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          + Soumettre un autre
        </button>
      </div>
    </div>
  )
}

// ─── Duplicate Declaration Dialog ─────────────────────────────────────────────
function DuplicateDialog({
  existing, onVote, onForce, onClose,
}: {
  existing: { id: string; title: string; ref_citoyen: string; status: string; votes_count: number };
  onVote:  () => void;
  onForce: () => void;
  onClose: () => void;
}) {
  const statusLabel: Record<string, string> = {
    soumise:        'Soumise',
    assignee_chef:  'En cours',
    assignee_agent: 'En cours',
    en_cours:       'En cours',
    resolue:        'Résolue',
  }
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,40,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl p-6"
        onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-[#0A1628] dark:text-white text-center mb-2">
          Déclaration similaire existante
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-5 leading-relaxed">
          Une déclaration similaire existe déjà à cet endroit&nbsp;:
        </p>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 mb-5">
          <p className="text-sm font-bold text-[#0A1628] dark:text-white mb-1">« {existing.title} »</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Réf&nbsp;: <span className="font-mono font-bold text-[#1557FF]">{existing.ref_citoyen}</span>
            &nbsp;·&nbsp;Statut&nbsp;: <span className="font-semibold">{statusLabel[existing.status] || existing.status}</span>
            &nbsp;·&nbsp;{existing.votes_count ?? 0} soutien(s)
          </p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 text-center mb-5">
          Voulez-vous voter pour celle-ci au lieu de créer un doublon&nbsp;?
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={onVote}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
            style={{ background: '#1557FF' }}>
            👍 Voter pour celle-ci
          </button>
          <button onClick={onForce}
            className="w-full py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Créer quand même
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const NouveauSignalement: React.FC = () => {
  const [searchParams]               = useSearchParams()
  const navigate                     = useNavigate()
  const fromMap                      = searchParams.get('from') === 'map'

  const [step,       setStep]       = useState(1)
  const [loading,    setLoading]    = useState(false)
  const [refCitoyen, setRefCitoyen] = useState('')
  const [submitted,  setSubmitted]  = useState(false)
  const [delegations, setDelegations] = useState<any[]>([])
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null)   // 409 duplicate payload
  const [forceCreate,  setForceCreate]  = useState(false)          // skip dup check on retry
  // Fast-lane: photo File reconstructed from sessionStorage
  const [mapAutoFile, setMapAutoFile] = useState<File | null>(null)

  useEffect(() => {
    fetch(`${API}/public/delegations`)
      .then(r => r.json())
      .then(data => setDelegations(data.delegations || []))
      .catch(console.error)
  }, [])

  const [formData,   setFormData]   = useState({
    latitude: 0, longitude: 0, address: '', delegation_id: '',
    category: '', urgency: 'moyen', title: '', description: '',
    photo: null as File | null, hazard: false, hazard_note: '',
    has_critical_infrastructure: false, sensitive_type: '',
    // AI vision result fields
    ai_analyzed: false,
    ai_confidence: 0,
    ai_reasoning: '',
    ai_danger_score: 0,
  })

  const update = (patch: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...patch }))

  // ── Fast-lane bootstrap (only when ?from=map) ──────────────────────────────
  useEffect(() => {
    if (!fromMap) return

    const b64  = sessionStorage.getItem('map_photo_b64')
    const name = sessionStorage.getItem('map_photo_name') || 'photo.jpg'
    const type = sessionStorage.getItem('map_photo_type') || 'image/jpeg'
    const lat  = parseFloat(sessionStorage.getItem('map_photo_lat') || '0')
    const lng  = parseFloat(sessionStorage.getItem('map_photo_lng') || '0')

    // Clear so we don't re-use stale data on next visit
    sessionStorage.removeItem('map_photo_b64')
    sessionStorage.removeItem('map_photo_name')
    sessionStorage.removeItem('map_photo_type')
    sessionStorage.removeItem('map_photo_lat')
    sessionStorage.removeItem('map_photo_lng')

    if (!b64 || !lat || !lng) return

    // Convert base64 → File
    const byteString = atob(b64.split(',')[1])
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
    const file = new File([ab], name, { type })

    // Reverse-geocode to get address, then jump straight to step 3
    const bootstrap = async () => {
      let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      let delegation_id = ''
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1&accept-language=fr`
        )
        const d = await r.json()
        if (!d.display_name) console.warn('[Nominatim] No display_name (map bootstrap):', d)
        address = d.display_name ? d.display_name.split(',').slice(0, 3).join(',').trim() : address
      } catch { /* keep coords as address */ }

      // Try to detect delegation from coordinates
      const delegationsRes = await fetch(`${API}/public/delegations`).then(r => r.json()).catch(() => ({ delegations: [] }))
      const dels = delegationsRes.delegations || []
      delegation_id = detectArrondissement(lat, lng, dels) || ''

      update({ latitude: lat, longitude: lng, address, delegation_id })
      setMapAutoFile(file)
      setStep(3)   // jump directly to details/AI step

      toast('📍 Localisation récupérée depuis la carte !', { icon: '🗺️' })
    }

    bootstrap()
  }, [fromMap])

  const handleSubmit = async (force = false) => {
    setLoading(true)
    const token = localStorage.getItem('fmc_token')
    try {
      const body = new FormData()
      body.append('title',         formData.title)
      body.append('description',   formData.description)
      body.append('category',      formData.category)
      body.append('delegation_id', formData.delegation_id)
      body.append('latitude',      String(formData.latitude))
      body.append('longitude',     String(formData.longitude))
      body.append('address',       formData.address)

      // ── Force flag (skip duplicate check) ────────────────────────
      if (force || forceCreate) body.append('force', 'true')

      // ── AI vision fields ──────────────────────────────────────────
      if (formData.ai_analyzed) {
        // Map urgency → ai_priority label the backend understands
        const urgencyToAI: Record<string, string> = {
          urgent: 'haute', moyen: 'moyenne', faible: 'basse'
        }
        body.append('ai_priority',     urgencyToAI[formData.urgency] || 'moyenne')
        body.append('used_ai_vision',  'true')
        body.append('ai_confidence',   String(formData.ai_confidence || 80))
        body.append('ai_reasoning',    formData.ai_reasoning || '')
        body.append('ai_severity_label', formData.urgency)
        body.append('ai_danger_score', String(formData.ai_danger_score || 0))
      } else {
        // Manual urgency — still send as priority fallback
        const urgencyToDb: Record<string, string> = {
          urgent: 'haute', moyen: 'moyenne', faible: 'basse'
        }
        body.append('priority',        urgencyToDb[formData.urgency] || 'moyenne')
        body.append('used_ai_vision',  'false')
      }

      // ── Hazard flag ───────────────────────────────────────────────
      body.append('hazard',      String(formData.hazard))
      body.append('hazard_note', formData.hazard_note || '')

      // ── Sensitive zone (citizen self-report) ──────────────────────
      body.append('has_critical_infrastructure', String(formData.has_critical_infrastructure || false))
      body.append('citizen_sensitive_type',      formData.sensitive_type || '')

      if (formData.photo) body.append('photo', formData.photo)
      const res  = await fetch(`${API}/declarations`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body,
      })
      const data = await res.json()

      // ── Duplicate detected by backend ──────────────────────────────
      if (res.status === 409 && data.duplicate) {
        setDuplicateInfo(data.existing)
        setLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la soumission');
      }

      setRefCitoyen(data.declaration?.ref_citoyen || data.ref_citoyen || 'SOU-2026-00-0001')
      setSubmitted(true)
    } catch (err: any) {
      alert(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setSubmitted(false); setStep(1)
    setMapAutoFile(null)
    setFormData({
      latitude:0, longitude:0, address:'', delegation_id:'',
      category:'', urgency:'moyen', title:'', description:'',
      photo:null, hazard:false, hazard_note:'',
      has_critical_infrastructure: false, sensitive_type: '',
      ai_analyzed: false, ai_confidence: 0, ai_reasoning: '',
      ai_danger_score: 0,
    })
  }

  return (
    <CitizenLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {!submitted && (
          <div className="mb-6">
            <ProgressBar step={step} total={4} />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-slate-400">{['Localisation','Catégorie','Détails','Vérification'][step-1]}</p>
              <p className="text-xs text-slate-400">Étape {step} sur 4</p>
            </div>
          </div>
        )}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          {submitted       ? <SuccessScreen ref_citoyen={refCitoyen} onNew={reset} />
          : step === 1     ? <Step1 data={formData} onChange={update} onNext={() => setStep(2)} delegations={delegations} />
          : step === 2     ? <Step2 data={formData} onChange={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />
          : step === 3     ? <Step3 data={formData} onChange={update} onNext={() => setStep(4)} onBack={() => fromMap ? setStep(1) : setStep(2)} autoFile={mapAutoFile} />
          : <Step4 data={formData} onSubmit={() => handleSubmit(false)} onBack={() => setStep(3)} loading={loading} delegations={delegations} />}
        </div>

        {/* Duplicate declaration dialog */}
        {duplicateInfo && (
          <DuplicateDialog
            existing={duplicateInfo}
            onVote={async () => {
              const token = localStorage.getItem('fmc_token')
              try {
                const r = await fetch(`${API}/declarations/${duplicateInfo.id}/vote`, {
                  method: 'POST', headers: { Authorization: `Bearer ${token}` },
                })
                if (r.ok) {
                  toast.success('Votre vote a été enregistré !')
                  setDuplicateInfo(null)
                  navigate('/citizen/mes-signalements')
                } else {
                  const e = await r.json()
                  toast.error(e.error || 'Erreur lors du vote.')
                }
              } catch {
                toast.error('Erreur serveur.')
              }
            }}
            onForce={() => {
              setForceCreate(true)
              setDuplicateInfo(null)
              handleSubmit(true)
            }}
            onClose={() => setDuplicateInfo(null)}
          />
        )}
        {!submitted && step < 4 && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🛡️</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#0A1628] dark:text-white">Données sécurisées</p>
                <p className="text-[10px] text-slate-400">Anonymat garanti</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm">⏱️</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#0A1628] dark:text-white">Suivi 24h/24</p>
                <p className="text-[10px] text-slate-400">Réponse sous 48h</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </CitizenLayout>
  )
}

export default NouveauSignalement