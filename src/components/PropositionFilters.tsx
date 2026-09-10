import { MultiSelectDropdown } from './MultiSelectDropdown'
import { DEEP_SKY_CATALOGS } from '../lib/objectCoordinates'
import { FILTERABLE_OBJECT_TYPES, labelForObjectType } from '../lib/objectType'

const PROPOSAL_LIMIT_OPTIONS = [20, 50, 100, 200, 500]

interface PropositionFiltersProps {
  catalogs: Set<string>
  onToggleCatalog: (catalog: string) => void
  types: Set<string>
  onToggleType: (type: string) => void
  minFramePortionPercent: number | null
  onMinFramePortionPercentChange: (percent: number | null) => void
  maxFramePortionPercent: number | null
  onMaxFramePortionPercentChange: (percent: number | null) => void
  minMoonSeparationDeg: number | null
  onMinMoonSeparationDegChange: (deg: number | null) => void
  minAverageAltitudeDeg: number | null
  onMinAverageAltitudeDegChange: (deg: number | null) => void
  limit: number
  onLimitChange: (limit: number) => void
}

function parseOptionalNumberInput(value: string, onChange: (n: number | null) => void) {
  if (value.trim() === '') {
    onChange(null)
    return
  }
  const parsed = Number.parseFloat(value)
  if (Number.isNaN(parsed) || parsed < 0) return
  onChange(parsed)
}

/**
 * Search filters for the Planning tab's "Propositions" list — which catalogues to search,
 * frame-portion range, min Moon distance, min average altitude, and how many results to
 * show. These are search criteria for the current session, not app configuration, so they
 * live inline above the list they filter rather than on the Configuration page.
 */
export function PropositionFilters({
  catalogs,
  onToggleCatalog,
  types,
  onToggleType,
  minFramePortionPercent,
  onMinFramePortionPercentChange,
  maxFramePortionPercent,
  onMaxFramePortionPercentChange,
  minMoonSeparationDeg,
  onMinMoonSeparationDegChange,
  minAverageAltitudeDeg,
  onMinAverageAltitudeDegChange,
  limit,
  onLimitChange,
}: PropositionFiltersProps) {
  return (
    <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <MultiSelectDropdown
          label="Catalogues"
          options={DEEP_SKY_CATALOGS}
          selected={catalogs}
          onToggle={onToggleCatalog}
        />

        <MultiSelectDropdown
          label="Object type"
          options={FILTERABLE_OBJECT_TYPES}
          selected={types}
          onToggle={onToggleType}
          optionLabel={(type) => labelForObjectType(type) ?? type}
        />

        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Min frame portion (%)
          <input
            type="number"
            min={0}
            step={1}
            value={minFramePortionPercent ?? ''}
            onChange={(e) => parseOptionalNumberInput(e.target.value, onMinFramePortionPercentChange)}
            placeholder="No limit"
            className="w-28 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Max frame portion (%)
          <input
            type="number"
            min={0}
            step={1}
            value={maxFramePortionPercent ?? ''}
            onChange={(e) => parseOptionalNumberInput(e.target.value, onMaxFramePortionPercentChange)}
            placeholder="No limit"
            className="w-28 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Min Moon distance (°)
          <input
            type="number"
            min={0}
            max={180}
            step={1}
            value={minMoonSeparationDeg ?? ''}
            onChange={(e) => parseOptionalNumberInput(e.target.value, onMinMoonSeparationDegChange)}
            placeholder="No limit"
            className="w-28 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Min average height (°)
          <input
            type="number"
            min={0}
            max={90}
            step={1}
            value={minAverageAltitudeDeg ?? ''}
            onChange={(e) => parseOptionalNumberInput(e.target.value, onMinAverageAltitudeDegChange)}
            placeholder="No limit"
            className="w-28 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          Show up to
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="w-28 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
          >
            {PROPOSAL_LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option} className="bg-slate-800">
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Every filter is optional — leave it unset and it won't narrow the results. Moon distance is the closest the
        Moon comes tonight; average height is averaged across the time the object is up tonight — both require an
        observing location, set in Configuration.
      </p>
    </div>
  )
}
