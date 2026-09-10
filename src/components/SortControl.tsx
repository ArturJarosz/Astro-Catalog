import type { SortDirection, SortKey } from '../lib/sortObjects'

interface SortControlProps {
  sortKey: SortKey
  sortDirection: SortDirection
  onSortKeyChange: (key: SortKey) => void
  onSortDirectionChange: (direction: SortDirection) => void
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'exposure', label: 'Total Exposure' },
  { value: 'lastSession', label: 'Last Session' },
]

export function SortControl({ sortKey, sortDirection, onSortKeyChange, onSortDirectionChange }: SortControlProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <select
        value={sortKey}
        onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-800">
            {opt.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
        title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        aria-label={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 transition hover:bg-white/10"
      >
        {sortDirection === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  )
}
