import { useState } from 'react'
import type { WarningInfo } from '../../electron/shared-types'

interface WarningsPanelProps {
  warnings: WarningInfo[]
}

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  const [open, setOpen] = useState(false)

  if (warnings.length === 0) return null

  return (
    <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-amber-300"
      >
        <span>
          {warnings.length} warning{warnings.length === 1 ? '' : 's'} found during last scan
        </span>
        <span className="text-amber-400/90">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ul className="space-y-1.5 border-t border-amber-400/10 px-4 py-3 text-xs text-amber-200/90">
          {warnings.map((w, i) => (
            <li key={i} className="font-mono">
              <span className="text-amber-400">{w.path}</span>
              <span className="text-amber-200/90"> — {w.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
