import { useCallback, useEffect, useRef, useState } from 'react'
import { generateRoute, wakeServer, type RunRoute } from './api'
import DistanceInput, { parseKm } from './components/DistanceInput'
import MapView from './components/MapView'
import PlaceSearch from './components/PlaceSearch'
import { download, toGpx } from './lib/geo'

interface Start {
  lat: number
  lng: number
  label: string
}

const PACE_MIN_PER_KM = 6

function formatDuration(minutes: number): string {
  const total = Math.round(minutes)
  if (total < 60) return `${total} min`
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`
}

function pinLabel(lat: number, lng: number): string {
  return `Pin at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

export default function App() {
  const [start, setStart] = useState<Start | null>(null)
  const [kmText, setKmText] = useState('5')
  const [route, setRoute] = useState<RunRoute | null>(null)
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)

  const km = parseKm(kmText)

  const changeStart = useCallback((next: Start) => {
    request.current?.abort()
    setLoading(false)
    setStart(next)
    setRoute(null)
    setError(null)
  }, [])

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('This browser can’t share your location. Search for a place or click the map instead.')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        changeStart({ lat: coords.latitude, lng: coords.longitude, label: 'Current location' })
      },
      (failure) => {
        setLocating(false)
        setError(
          failure.code === failure.PERMISSION_DENIED
            ? 'Location access is blocked. Search for a place or click the map instead.'
            : 'Couldn’t get your location. Search for a place or click the map instead.',
        )
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }, [changeStart])

  useEffect(() => {
    wakeServer()
    // Only locate unprompted if the user has already allowed it; otherwise wait to be asked.
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((status) => {
        if (status.state === 'granted') locate()
      })
      .catch(() => {})
  }, [locate])

  async function generate() {
    if (!start || km === null) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setSlow(false)
    setError(null)
    const slowTimer = setTimeout(() => setSlow(true), 5000)
    try {
      setRoute(await generateRoute(start, km, controller.signal))
    } catch (e) {
      if (controller.signal.aborted) return
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      clearTimeout(slowTimer)
      if (request.current === controller) setLoading(false)
    }
  }

  const routeKm = route ? route.distanceMeters / 1000 : null

  return (
    <div className="relative h-full overflow-hidden">
      <MapView
        start={start}
        route={route?.coordinates ?? null}
        onPick={({ lat, lng }) => changeStart({ lat, lng, label: pinLabel(lat, lng) })}
      />

      <main
        id="panel"
        className="absolute inset-x-0 bottom-0 z-[1000] rounded-t-2xl border-t border-line bg-white px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0_0_0/0.08)] md:inset-x-auto md:top-4 md:bottom-auto md:left-4 md:w-[352px] md:rounded-2xl md:border md:p-5 md:shadow-[0_8px_30px_rgb(0_0_0/0.08)]"
      >
        <header className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#17191c" />
            <path
              d="M11 22.5c-3 0-5-2.2-5-5s2-5 5-5h10c3 0 5 2.2 5 5s-2 5-5 5"
              fill="none"
              stroke="#f04e23"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="16" cy="22.5" r="2.5" fill="#fff" />
          </svg>
          <h1 className="text-[17px] font-semibold tracking-tight">Looprun</h1>
        </header>

        <section className="mt-5">
          <h2 className="mb-2 text-xs font-medium text-muted">Start</h2>
          <PlaceSearch
            label={start?.label ?? ''}
            near={start}
            locating={locating}
            onLocate={locate}
            onSelect={(place) => changeStart({ lat: place.lat, lng: place.lng, label: place.name })}
          />
          {!start && (
            <p className="mt-2 text-xs text-muted">
              Search, use your location, or click anywhere on the map.
            </p>
          )}
        </section>

        <section className="mt-5">
          <h2 className="mb-1 text-xs font-medium text-muted">Distance</h2>
          <DistanceInput value={kmText} onChange={setKmText} />
        </section>

        <button
          type="button"
          onClick={generate}
          disabled={!start || km === null || loading}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink text-[15px] font-medium text-white transition-colors hover:bg-black disabled:bg-wash disabled:text-muted"
        >
          {loading && (
            <svg viewBox="0 0 16 16" className="size-4 animate-spin" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
              <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {loading ? (slow ? 'Waking the server…' : 'Finding a route…') : route ? 'Generate another' : 'Generate route'}
        </button>

        {loading && slow && (
          <p className="mt-2 text-xs text-muted">The server sleeps when idle. The first route can take up to a minute.</p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {route && routeKm !== null && (
          <section className="mt-4 flex items-center justify-between border-t border-line pt-4" aria-live="polite">
            <dl className="flex gap-6">
              <div>
                <dt className="text-xs text-muted">Route</dt>
                <dd className="text-[15px] font-semibold tabular-nums">{routeKm.toFixed(2)} km</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">At {PACE_MIN_PER_KM}:00 /km</dt>
                <dd className="text-[15px] font-semibold tabular-nums">{formatDuration(routeKm * PACE_MIN_PER_KM)}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() =>
                download(
                  `looprun-${routeKm.toFixed(1)}km.gpx`,
                  toGpx(route.coordinates, `Looprun ${routeKm.toFixed(1)} km`),
                  'application/gpx+xml',
                )
              }
              className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium transition-colors hover:bg-wash"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 2v8m0 0L5 7m3 3 3-3M2.5 13.5h11" />
              </svg>
              GPX
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
