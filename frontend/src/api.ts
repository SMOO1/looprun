const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')

export type LatLng = [lat: number, lng: number]

export interface RunRoute {
  distanceMeters: number
  seed: number
  coordinates: LatLng[]
}

export interface Place {
  name: string
  detail: string
  lat: number
  lng: number
}

async function get<T>(path: string, params: Record<string, string | number>, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}?${query}`, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('Can’t reach the server. Check your connection and try again.')
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.detail ?? 'Something went wrong. Try again.')
  }
  return response.json()
}

export function generateRoute(start: { lat: number; lng: number }, km: number, signal?: AbortSignal) {
  return get<RunRoute>('/api/route', { lat: start.lat, lng: start.lng, km }, signal)
}

export function searchPlaces(q: string, near: { lat: number; lng: number } | null, signal?: AbortSignal) {
  return get<Place[]>('/api/geocode', near ? { q, lat: near.lat, lng: near.lng } : { q }, signal)
}

/** The free host sleeps when idle; poke it on page load so the first route is quicker. */
export function wakeServer() {
  fetch(`${API_URL}/actuator/health`, { mode: 'no-cors' }).catch(() => {})
}
