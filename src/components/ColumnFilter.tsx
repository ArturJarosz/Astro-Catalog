import { useEffect, useRef, useState } from 'react'
import { METRIC_OPTIONS, type MetricKey } from '../lib/columns'

interface ColumnFilterProps {
  frameTypeOptions: string[]
  selectedFrameTypes: Set<string>
  onToggleFrameType: (name: string) => void
  showTotal: boolean
  onToggleTotal: () => void
  selectedMetrics: Set<MetricKey>
  onToggleMetric: (key: MetricKey) => void
  hiddenMetrics?: Set<MetricKey>
  /** Planning view has no per-frame-type breakdown column, so that section doesn't apply. */
  isPlanning?: boolean
}

export function ColumnFilter({
  frameTypeOptions,
  selectedFrameTypes,
  onToggleFrameType,
  showTotal,
  onToggleTotal,
  selectedMetrics,
  onToggleMetric,
  hiddenMetrics,
  isPlanning = false,
}: ColumnFilterProps) {
  const metricOptions = hiddenMetrics ? METRIC_OPTIONS.filter((opt) => !hiddenMetrics.has(opt.key)) : METRIC_OPTIONS
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
      >
        Columns
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-white/10 bg-slate-800 p-3 shadow-xl">
          {!isPlanning && (
            <>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Frame types</p>
              <div className="mb-3 flex flex-col gap-1">
                {frameTypeOptions.map((name) => (
                  <label key={name} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedFrameTypes.has(name)}
                      onChange={() => onToggleFrameType(name)}
                      className="accent-sky-500"
                    />
                    {name}
                  </label>
                ))}
              </div>
            </>
          )}
          <div className="mb-3 flex flex-col gap-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={showTotal} onChange={onToggleTotal} className="accent-sky-500" />
              Total
            </label>
          </div>

          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">Show</p>
          <div className="flex flex-col gap-1">
            {metricOptions.map((opt) => (
              <label key={opt.key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={selectedMetrics.has(opt.key)}
                  onChange={() => onToggleMetric(opt.key)}
                  className="accent-sky-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
