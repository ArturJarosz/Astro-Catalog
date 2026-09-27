import { useRef, useState } from 'react'
import {
  OBJECT_TYPE_COLORS,
  OBJECT_TYPE_HUES_BY_GROUP,
  OBJECT_TYPE_SHADES,
  OBJECT_TYPE_SHADE_LABELS,
  objectTypeColorKeyFor,
  type ObjectTypeColorKey,
} from '../lib/objectTypeColor'
import { useDismissable } from '../lib/useDismissable'

interface ObjectTypeColorPickerProps {
  /** The type's human-readable name, shown in the badge that opens the picker. */
  label: string
  value: ObjectTypeColorKey
  onChange: (color: ObjectTypeColorKey) => void
}

/**
 * The badge for one object type, doubling as its colour picker: clicking it opens a grid of
 * swatches — hue across, brightness down. The badge is rendered in the colour it is setting,
 * so the configuration panel shows exactly what the object cards will look like.
 */
export function ObjectTypeColorPicker({ label, value, onChange }: ObjectTypeColorPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useDismissable(open, containerRef, () => setOpen(false))

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="true"
        aria-expanded={open}
        title={`${label} — ${OBJECT_TYPE_COLORS[value].label}. Click to change colour.`}
        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition hover:brightness-125 ${
          OBJECT_TYPE_COLORS[value].badge
        } ${open ? 'ring-1 ring-white/40' : ''}`}
      >
        {label}
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 flex w-max gap-3 rounded-lg border border-white/10 bg-slate-800 p-2 shadow-xl">
          <div className="flex flex-col">
            <span className="mb-1 h-3" />
            {OBJECT_TYPE_SHADES.map((shade) => (
              <span
                key={shade}
                className="flex h-4 items-center pr-1 text-[10px] uppercase tracking-wide text-slate-400 not-first:mt-1"
              >
                {OBJECT_TYPE_SHADE_LABELS[shade]}
              </span>
            ))}
          </div>

          {OBJECT_TYPE_HUES_BY_GROUP.map(({ group, hues }) => (
            <div key={group} className="flex flex-col">
              <span className="mb-1 h-3 text-[10px] uppercase tracking-wide text-slate-400">{group}</span>
              {OBJECT_TYPE_SHADES.map((shade) => (
                <div key={shade} className="flex gap-1 not-first:mt-1">
                  {hues.map(({ hue, label: hueLabel }) => {
                    const key = objectTypeColorKeyFor(hue, shade)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          onChange(key)
                          setOpen(false)
                        }}
                        title={OBJECT_TYPE_COLORS[key].label}
                        aria-label={`${hueLabel}, ${OBJECT_TYPE_SHADE_LABELS[shade].toLowerCase()}`}
                        aria-pressed={key === value}
                        className={`h-4 w-4 rounded-full transition hover:scale-125 ${
                          OBJECT_TYPE_COLORS[key].swatch
                        } ${key === value ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-800' : ''}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
