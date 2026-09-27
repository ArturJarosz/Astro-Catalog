import { useEffect, useState } from 'react'
import { formatExposure, formatSize } from '../lib/format'
import { isFrameExtension } from '../../electron/file-types'
import type { CatalogueTotals } from '../lib/catalogueSummary'

interface CatalogueSummaryProps {
  totals: CatalogueTotals
  /** True when a name filter or catalog selection is narrowing what the totals cover. */
  filtered: boolean
}

const COLLAPSED_STORAGE_KEY = 'catalogueSummaryCollapsed'

/** Catalogue-wide totals — objects, frames, integration time, disk use — plus a per-frame-type breakdown. */
export function CatalogueSummary({ totals, filtered }: CatalogueSummaryProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return (
    <section className="mb-10">
      <h2
        className={`flex items-baseline gap-2 text-base font-semibold uppercase tracking-wide text-slate-300 ${
          collapsed ? '' : 'mb-3'
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((previous) => !previous)}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand summary' : 'Collapse summary'}
          className="flex items-baseline gap-2 rounded transition hover:text-slate-200"
        >
          <span className="text-[10px] leading-none text-slate-400">{collapsed ? '▶' : '▼'}</span>
          Summary
          <span className="text-xs font-normal normal-case text-slate-400">
            ({totals.objectCount.toLocaleString()} objects{filtered ? ', filtered' : ''})
          </span>
        </button>
      </h2>

      {!collapsed && totals.frameTypes.length > 0 && (
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 gap-y-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs tabular-nums">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-300">Type</span>
          <span className="text-right text-[10px] font-medium uppercase tracking-wide text-slate-300">Frames</span>
          <span className="text-right text-[10px] font-medium uppercase tracking-wide text-slate-300">Time</span>
          <span className="text-right text-[10px] font-medium uppercase tracking-wide text-slate-300">Space</span>
          {totals.frameTypes.map((frameType) => (
            <div className="contents" key={frameType.name}>
              <span className="text-slate-200">{frameType.name}</span>
              <span className="text-right text-slate-200">{frameType.totalFrames.toLocaleString()}</span>
              <span className="text-right text-slate-200">{formatExposure(frameType.totalExposureSeconds)}</span>
              <span className="text-right text-slate-200">{formatSize(frameType.totalSizeBytes)}</span>
            </div>
          ))}
          <div className="contents">
            <span className="mt-1 border-t border-white/10 pt-1 font-semibold uppercase tracking-wide text-slate-300">
              Total
            </span>
            <span className="mt-1 border-t border-white/10 pt-1 text-right font-semibold text-slate-100">
              {totals.totalFrames.toLocaleString()}
            </span>
            <span className="mt-1 border-t border-white/10 pt-1 text-right font-semibold text-slate-100">
              {formatExposure(totals.totalExposureSeconds)}
            </span>
            <span className="mt-1 border-t border-white/10 pt-1 text-right font-semibold text-slate-100">
              {formatSize(totals.totalSizeBytes)}
            </span>
          </div>
        </div>
      )}

      {!collapsed && totals.fileTypes.length > 0 && (
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs tabular-nums">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-300">File type</span>
          <span className="text-right text-[10px] font-medium uppercase tracking-wide text-slate-300">Files</span>
          <span className="text-right text-[10px] font-medium uppercase tracking-wide text-slate-300">Space</span>
          {totals.fileTypes.map((fileType) => (
            <div className="contents" key={fileType.extension}>
              <span className="uppercase text-slate-200">
                {fileType.extension}
                {isFrameExtension(fileType.extension) && (
                  <span className="ml-1.5 normal-case text-[10px] text-slate-400">frames</span>
                )}
              </span>
              <span className="text-right text-slate-200">{fileType.count.toLocaleString()}</span>
              <span className="text-right text-slate-200">{formatSize(fileType.sizeBytes)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
