export const MIN_KM = 1
export const MAX_KM = 50

const PRESETS = [3, 5, 10, 21.1]

interface Props {
  value: string
  onChange: (value: string) => void
}

export function parseKm(value: string): number | null {
  const km = Number(value.replace(',', '.'))
  return value.trim() !== '' && Number.isFinite(km) && km >= MIN_KM && km <= MAX_KM ? km : null
}

export default function DistanceInput({ value, onChange }: Props) {
  const km = parseKm(value)

  return (
    <div>
      <div className="flex items-end justify-between">
        <label className="flex items-baseline gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            aria-label="Distance in kilometres"
            min={MIN_KM}
            max={MAX_KM}
            step="0.1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => {
              const n = Number(value)
              if (!Number.isFinite(n) || value.trim() === '') onChange('5')
              else onChange(String(Math.min(MAX_KM, Math.max(MIN_KM, Math.round(n * 10) / 10))))
            }}
            className="w-[4.2ch] bg-transparent text-4xl font-semibold tracking-tight tabular-nums outline-none"
            style={{ width: `${Math.max(1, value.length)}ch` }}
          />
          <span className="text-base text-muted">km</span>
        </label>
        <div className="flex gap-1 pb-1">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(String(preset))}
              aria-pressed={km === preset}
              className={`h-7 rounded-md px-2 text-[13px] font-medium tabular-nums transition-colors ${
                km === preset ? 'bg-ink text-white' : 'text-muted hover:bg-wash hover:text-ink'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
      <input
        type="range"
        aria-label="Distance"
        min={MIN_KM}
        max={30}
        step="0.5"
        value={Math.min(km ?? MIN_KM, 30)}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 block w-full"
      />
      {km === null && (
        <p className="mt-1.5 text-xs text-muted">
          Enter a distance between {MIN_KM} and {MAX_KM} km.
        </p>
      )}
    </div>
  )
}
