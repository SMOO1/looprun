import L from 'leaflet'
import { useEffect, useRef } from 'react'
import type { LatLng } from '../api'
import { pointsEvery } from '../lib/geo'

interface Props {
  start: { lat: number; lng: number } | null
  route: LatLng[] | null
  onPick: (point: { lat: number; lng: number }) => void
}

const DESKTOP = '(min-width: 768px)'

/** Keeps the route clear of the control panel, which floats over the map. */
function fitPadding(): L.FitBoundsOptions {
  const panel = document.getElementById('panel')
  if (!panel) return { padding: [32, 32] }
  if (window.matchMedia(DESKTOP).matches) {
    return { paddingTopLeft: [panel.offsetWidth + 48, 48], paddingBottomRight: [48, 48] }
  }
  return { paddingTopLeft: [28, 28], paddingBottomRight: [28, panel.offsetHeight + 28] }
}

export default function MapView({ start, route, onPick }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const startMarker = useRef<L.Marker | null>(null)
  const routeLayer = useRef<L.LayerGroup | null>(null)
  const onPickRef = useRef(onPick)

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    const instance = L.map(container.current!, {
      center: [25, 5],
      zoom: 3,
      minZoom: 2,
      zoomControl: false,
      worldCopyJump: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instance)
    if (window.matchMedia(DESKTOP).matches) {
      L.control.zoom({ position: 'bottomright' }).addTo(instance)
    }
    instance.on('click', (e) => onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.wrap().lng }))
    routeLayer.current = L.layerGroup().addTo(instance)
    map.current = instance
    return () => {
      instance.remove()
      map.current = null
      startMarker.current = null
    }
  }, [])

  useEffect(() => {
    const instance = map.current
    if (!instance) return
    if (!start) {
      startMarker.current?.remove()
      startMarker.current = null
      return
    }
    const position: L.LatLngTuple = [start.lat, start.lng]
    if (startMarker.current) {
      startMarker.current.setLatLng(position)
    } else {
      startMarker.current = L.marker(position, {
        icon: L.divIcon({ className: '', html: '<div class="start-marker"></div>', iconSize: [18, 18] }),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(instance)
    }
    // Don't yank the view around when the user is just nudging the pin nearby.
    if (instance.getZoom() < 13 || !instance.getBounds().pad(-0.2).contains(position)) {
      instance.flyTo(position, Math.max(instance.getZoom(), 14), { duration: 0.8 })
    }
  }, [start])

  useEffect(() => {
    const instance = map.current
    const layer = routeLayer.current
    if (!instance || !layer) return
    layer.clearLayers()
    if (!route || route.length < 2) return

    L.polyline(route, { color: '#fff', weight: 8, opacity: 0.9, interactive: false }).addTo(layer)
    const line = L.polyline(route, { color: '#f04e23', weight: 4, interactive: false }).addTo(layer)

    const totalKm = pointsEvery(route, 1000).length
    const stepKm = totalKm <= 12 ? 1 : totalKm <= 30 ? 2 : 5
    pointsEvery(route, stepKm * 1000).forEach((point, i) => {
      L.marker(point, {
        icon: L.divIcon({
          className: '',
          html: `<div class="km-marker">${(i + 1) * stepKm}</div>`,
          iconSize: [20, 20],
        }),
        interactive: false,
      }).addTo(layer)
    })

    instance.flyToBounds(line.getBounds(), { ...fitPadding(), duration: 0.8 })
  }, [route])

  return <div ref={container} className="picking h-full w-full" aria-label="Map" />
}
