import { useRef, useState } from 'react'
import { useDismissable } from '../lib/useDismissable'

interface MultiSelectDropdownProps<T extends string> {
  label: string
  options: readonly T[]
  selected: Set<T>
  onToggle: (option: T) => void
  optionLabel?: (option: T) => string
}

function summarize(selectedCount: number, totalCount: number): string {
  if (totalCount === 0 || selectedCount === totalCount) return 'All'
  if (selectedCount === 0) return 'None'
  return `${selectedCount} of ${totalCount}`
}

/**
 * A labeled button that opens a checkbox-list panel for picking a subset of `options` —
 * used wherever a filter needs multi-selection from a fixed set of options (e.g. the
 * Propositions filters' catalogue and object-type pickers) instead of a wall of checkboxes.
 */
export function MultiSelectDropdown<T extends string>({
  label,
  options,
  selected,
  onToggle,
  optionLabel = (o) => o,
}: MultiSelectDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useDismissable(open, containerRef, () => setOpen(false))

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-40 items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-sm text-slate-200 transition hover:bg-white/10"
      >
        <span className="truncate">{summarize(selected.size, options.length)}</span>
        <span className="shrink-0 text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-white/10 bg-slate-800 p-2 shadow-xl">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-slate-200 hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selected.has(option)}
                onChange={() => onToggle(option)}
                className="accent-sky-500"
              />
              {optionLabel(option)}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
