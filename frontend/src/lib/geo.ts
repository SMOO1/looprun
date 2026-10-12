import type { LatLng } from '../api'

const EARTH_RADIUS_M = 6_371_008.8

export function distance(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (b[0] - a[0]) * rad
  const dLng = (b[1] - a[1]) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** Points along the path at every `stepMeters`, not including the start or the very end. */
export function pointsEvery(path: LatLng[], stepMeters: number): LatLng[] {
  const marks: LatLng[] = []
  let travelled = 0
  let next = stepMeters
  for (let i = 1; i < path.length; i++) {
    const segment = distance(path[i - 1], path[i])
    while (segment > 0 && travelled + segment >= next) {
      const t = (next - travelled) / segment
      marks.push([
        path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t,
        path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t,
      ])
      next += stepMeters
    }
    travelled += segment
  }
  // A marker sitting on the finish line would just cover the start pin.
  if (marks.length > 0 && travelled - (next - stepMeters) < stepMeters * 0.15) marks.pop()
  return marks
}

export function toGpx(path: LatLng[], name: string): string {
  const points = path.map(([lat, lng]) => `      <trkpt lat="${lat}" lon="${lng}"/>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Looprun" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${name}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`
}

export function download(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
