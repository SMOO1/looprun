import { useEffect, useId, useRef, useState } from 'react'
import { searchPlaces, type Place } from '../api'

interface Props {
  /** What the field shows when the user isn't typing: the current start point. */
  label: string
  near: { lat: number; lng: number } | null
  locating: boolean
  onSelect: (place: Place) => void
  onLocate: () => void
}

export default function PlaceSearch({ label, near, locating, onSelect, onLocate }: Props) {
  const [query, setQuery] = useState<string | null>(null)
  const [results, setResults] = useState<Place[]>([])
  const [active, setActive] = useState(0)
  const [searched, setSearched] = useState(false)
  const listId = useId()
  const nearRef = useRef(near)

  useEffect(() => {
    nearRef.current = near
  }, [near])

  useEffect(() => {
    const text = query?.trim() ?? ''
    if (text.length < 3) {
      setResults([])
      setSearched(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(text, nearRef.current, controller.signal)
        .then((places) => {
          setResults(places)
          setActive(0)
          setSearched(true)
        })
        .catch(() => {})
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const editing = query !== null
  const open = editing && (results.length > 0 || searched)

  function choose(place: Place) {
    onSelect(place)
    setQuery(null)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setQuery(null)
      e.currentTarget.blur()
    } else if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      choose(results[active])
      e.currentTarget.blur()
    }
  }

  return (
    <div className="relative">
      <div className="flex h-11 items-center rounded-lg border border-line bg-white transition-colors focus-within:border-ink">
        <input
          type="text"
          role="combobox"
          aria-label="Start location"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search for a place"
          value={editing ? query : label}
          onFocus={(e) => {
            setQuery('')
            e.currentTarget.select()
          }}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setQuery(null)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 truncate bg-transparent pl-3 text-[15px] outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          title="Use my location"
          aria-label="Use my location"
          className="mr-1 grid size-9 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-wash hover:text-ink disabled:pointer-events-none"
        >
          <svg
            viewBox="0 0 20 20"
            className={`size-[18px] ${locating ? 'animate-pulse text-track' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <circle cx="10" cy="10" r="5.25" />
            <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
            <path d="M10 1.75v3M10 15.25v3M1.75 10h3M15.25 10h3" />
          </svg>
        </button>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 bottom-full z-10 mb-1.5 overflow-hidden md:top-full md:bottom-auto md:mt-1.5 md:mb-0 rounded-lg border border-line bg-white py-1 shadow-lg shadow-black/5"
        >
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted">No places found</li>}
          {results.map((place, i) => (
            <li
              key={`${place.lat},${place.lng}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the input's blur would close the list first.
              onMouseDown={(e) => {
                e.preventDefault()
                choose(place)
                ;(document.activeElement as HTMLElement | null)?.blur()
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 ${i === active ? 'bg-wash' : ''}`}
            >
              <div className="truncate text-sm font-medium">{place.name}</div>
              {place.detail && <div className="truncate text-xs text-muted">{place.detail}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
