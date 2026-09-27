import { useRef, useState } from 'react'
import { formatTimestamp } from '../lib/format'
import { useDismissable } from '../lib/useDismissable'
import type { ConnectionStatus } from '../App'

interface HeaderProps {
  rootPath: string | null
  lastScannedAt: string | null
  scanning: boolean
  scanProgressLabel: string | null
  onSelectRoot: () => void
  onAnalyze: () => void
  /** Null when partial analysis isn't possible yet (root never fully analysed). */
  onPartialAnalyze: (() => void) | null
  seestarStatus: ConnectionStatus
  onCheckSeestarConnection: () => void
  warningCount: number
  onWarningsClick: () => void
}

const SEESTAR_STATUS_LABEL: Record<ConnectionStatus, string> = {
  checking: 'Checking Seestar…',
  connected: 'Seestar connected',
  disconnected: 'Seestar not connected',
}

const SEESTAR_STATUS_DOT: Record<ConnectionStatus, string> = {
  checking: 'animate-pulse bg-slate-500',
  connected: 'bg-emerald-400',
  disconnected: 'bg-red-400',
}

export function Header({
  rootPath,
  lastScannedAt,
  scanning,
  scanProgressLabel,
  onSelectRoot,
  onAnalyze,
  onPartialAnalyze,
  seestarStatus,
  onCheckSeestarConnection,
  warningCount,
  onWarningsClick,
}: HeaderProps) {
  const [analyzeMenuOpen, setAnalyzeMenuOpen] = useState(false)
  const analyzeMenuRef = useRef<HTMLDivElement>(null)
  useDismissable(analyzeMenuOpen, analyzeMenuRef, () => setAnalyzeMenuOpen(false))
  const analyzeDisabled = scanning || !rootPath

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="bg-gradient-to-r from-sky-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
              Astro Catalogue
            </h1>
            <button
              onClick={onCheckSeestarConnection}
              title="Re-check Seestar connection"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
            >
              <span className={`h-2 w-2 rounded-full ${SEESTAR_STATUS_DOT[seestarStatus]}`} />
              {SEESTAR_STATUS_LABEL[seestarStatus]}
            </button>
            {warningCount > 0 && (
              <button
                onClick={onWarningsClick}
                title={`${warningCount} import warning${warningCount === 1 ? '' : 's'}`}
                className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300 transition hover:bg-amber-400/20"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path
                    fillRule="evenodd"
                    d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM10 8a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 8Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
                {warningCount}
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-300">
            {rootPath ? (
              <span className="font-mono text-slate-200">{rootPath}</span>
            ) : (
              'No root directory selected'
            )}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex gap-2">
            <button
              onClick={onSelectRoot}
              disabled={scanning}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Select Root Directory
            </button>
            <div ref={analyzeMenuRef} className="relative flex">
              <button
                onClick={onAnalyze}
                disabled={analyzeDisabled}
                className="rounded-l-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scanning ? 'Analyzing…' : 'Analyze'}
              </button>
              <button
                onClick={() => setAnalyzeMenuOpen((open) => !open)}
                disabled={analyzeDisabled}
                title="More analysis options"
                aria-haspopup="menu"
                aria-expanded={analyzeMenuOpen}
                className="rounded-r-lg border-l border-white/20 bg-indigo-500 px-2 py-2 text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {analyzeMenuOpen && !analyzeDisabled && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-white/10 bg-slate-900 py-1 text-sm shadow-xl"
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      setAnalyzeMenuOpen(false)
                      onAnalyze()
                    }}
                    className="block w-full px-3 py-2 text-left text-slate-200 hover:bg-white/10"
                  >
                    Full analysis
                    <span className="block text-xs text-slate-400">Re-scan the whole catalogue</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setAnalyzeMenuOpen(false)
                      onPartialAnalyze?.()
                    }}
                    disabled={!onPartialAnalyze}
                    title={onPartialAnalyze ? undefined : 'Run a full analysis of this root first'}
                    className="block w-full px-3 py-2 text-left text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Partial analysis…
                    <span className="block text-xs text-slate-400">New objects or selected objects only</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {scanning && scanProgressLabel ? scanProgressLabel : `Last scanned: ${formatTimestamp(lastScannedAt)}`}
          </p>
        </div>
      </div>
    </header>
  )
}
