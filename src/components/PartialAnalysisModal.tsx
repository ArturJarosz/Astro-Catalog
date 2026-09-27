import { useEffect, useMemo, useState } from 'react'
import type { ObjectInfo } from '../../electron/shared-types'

export interface PartialAnalysisRequest {
  /** Root-level folders not yet in the catalogue, to be scanned as new objects. */
  newTopLevelNames: string[]
  /** Paths of catalogued objects to re-scan (e.g. after frames were removed or added by hand). */
  objectPaths: string[]
}

interface PartialAnalysisModalProps {
  rootPath: string
  objects: ObjectInfo[]
  onRun: (request: PartialAnalysisRequest) => Promise<void>
  onClose: () => void
}

/** Drops Electron's "Error invoking remote method '…': Error:" wrapper so the main-process message reads cleanly. */
function ipcErrorMessage(error: unknown): string {
  return String(error).replace(/^Error: Error invoking remote method '[^']*': (?:Error: )?/, '')
}

const CHECKBOX_CLASS = 'h-3.5 w-3.5 accent-indigo-500'
const LINK_BUTTON_CLASS = 'text-xs text-sky-300 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50'

export function PartialAnalysisModal({ rootPath, objects, onRun, onClose }: PartialAnalysisModalProps) {
  const [importNew, setImportNew] = useState(true)
  const [reanalyze, setReanalyze] = useState(false)
  const [newFolders, setNewFolders] = useState<string[] | null>(null)
  const [selectedNewFolders, setSelectedNewFolders] = useState<Set<string>>(new Set())
  const [selectedObjectPaths, setSelectedObjectPaths] = useState<Set<string>>(new Set())
  const [objectFilter, setObjectFilter] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !running) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, running])

  useEffect(() => {
    let cancelled = false
    window.astroCatalogue
      .listNewTopLevelDirectories(rootPath)
      .then((folders) => {
        if (cancelled) return
        setNewFolders(folders)
        setSelectedNewFolders(new Set(folders))
      })
      .catch((e) => {
        if (!cancelled) {
          setNewFolders([])
          setError(ipcErrorMessage(e))
        }
      })
    return () => {
      cancelled = true
    }
  }, [rootPath])

  const sortedObjects = useMemo(
    () => [...objects].sort((a, b) => a.name.localeCompare(b.name) || Number(a.isMosaic) - Number(b.isMosaic)),
    [objects],
  )
  const filterText = objectFilter.trim().toLowerCase()
  const visibleObjects = filterText
    ? sortedObjects.filter((o) => o.name.toLowerCase().includes(filterText))
    : sortedObjects

  const newTopLevelNames = importNew ? [...selectedNewFolders] : []
  const objectPaths = reanalyze ? [...selectedObjectPaths] : []
  const canRun = !running && (newTopLevelNames.length > 0 || objectPaths.length > 0)

  function toggle(set: Set<string>, value: string): Set<string> {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  async function run() {
    if (!canRun) return
    setRunning(true)
    setError(null)
    try {
      await onRun({ newTopLevelNames, objectPaths })
      onClose()
    } catch (e) {
      setError(ipcErrorMessage(e))
      setRunning(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={() => !running && onClose()}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Partial analysis</h2>
          <button
            onClick={onClose}
            disabled={running}
            aria-label="Close"
            className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-slate-200 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5 text-sm">
          <p className="text-xs text-slate-400">
            Re-scans only the chosen object folders instead of the whole catalogue — useful after
            removing frames while processing, or after copying frames in by hand.
          </p>

          <section className="flex flex-col gap-2">
            <label className="flex items-center gap-2 font-medium text-slate-200">
              <input
                type="checkbox"
                className={CHECKBOX_CLASS}
                checked={importNew}
                disabled={running}
                onChange={(e) => setImportNew(e.target.checked)}
              />
              Import new objects
            </label>
            {importNew && (
              <div className="ml-5 flex flex-col gap-1">
                {newFolders === null ? (
                  <p className="text-xs text-slate-400">Looking for new folders…</p>
                ) : newFolders.length === 0 ? (
                  <p className="text-xs text-slate-400">No new object folders found.</p>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <button
                        className={LINK_BUTTON_CLASS}
                        disabled={running}
                        onClick={() => setSelectedNewFolders(new Set(newFolders))}
                      >
                        Select all
                      </button>
                      <button
                        className={LINK_BUTTON_CLASS}
                        disabled={running}
                        onClick={() => setSelectedNewFolders(new Set())}
                      >
                        Clear
                      </button>
                    </div>
                    <ul className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
                      {newFolders.map((folder) => (
                        <li key={folder}>
                          <label className="flex items-center gap-2 py-0.5 text-slate-200">
                            <input
                              type="checkbox"
                              className={CHECKBOX_CLASS}
                              checked={selectedNewFolders.has(folder)}
                              disabled={running}
                              onChange={() => setSelectedNewFolders((prev) => toggle(prev, folder))}
                            />
                            <span className="font-mono text-xs">{folder}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-col gap-2">
            <label className="flex items-center gap-2 font-medium text-slate-200">
              <input
                type="checkbox"
                className={CHECKBOX_CLASS}
                checked={reanalyze}
                disabled={running}
                onChange={(e) => setReanalyze(e.target.checked)}
              />
              Re-analyze existing objects
              {reanalyze && (
                <span className="text-xs font-normal text-slate-400">({selectedObjectPaths.size} selected)</span>
              )}
            </label>
            {reanalyze && (
              <div className="ml-5 flex min-h-0 flex-col gap-1">
                <input
                  type="text"
                  value={objectFilter}
                  placeholder="Filter objects…"
                  disabled={running}
                  onChange={(e) => setObjectFilter(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
                />
                <div className="flex gap-3">
                  <button
                    className={LINK_BUTTON_CLASS}
                    disabled={running || visibleObjects.length === 0}
                    onClick={() =>
                      setSelectedObjectPaths((prev) => new Set([...prev, ...visibleObjects.map((o) => o.path)]))
                    }
                  >
                    Select {filterText ? 'shown' : 'all'}
                  </button>
                  <button
                    className={LINK_BUTTON_CLASS}
                    disabled={running || selectedObjectPaths.size === 0}
                    onClick={() => setSelectedObjectPaths(new Set())}
                  >
                    Clear
                  </button>
                </div>
                <ul className="max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
                  {visibleObjects.length === 0 ? (
                    <li className="text-xs text-slate-400">No matching objects.</li>
                  ) : (
                    visibleObjects.map((object) => (
                      <li key={object.path}>
                        <label className="flex items-center gap-2 py-0.5 text-slate-200">
                          <input
                            type="checkbox"
                            className={CHECKBOX_CLASS}
                            checked={selectedObjectPaths.has(object.path)}
                            disabled={running}
                            onChange={() => setSelectedObjectPaths((prev) => toggle(prev, object.path))}
                          />
                          <span>{object.name}</span>
                          {object.isMosaic && (
                            <span className="rounded bg-fuchsia-500/20 px-1.5 text-[10px] uppercase text-fuchsia-200">
                              mosaic
                            </span>
                          )}
                        </label>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </section>

          <div className="flex items-center gap-2">
            <button
              onClick={run}
              disabled={!canRun}
              className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? 'Analyzing…' : 'Run partial analysis'}
            </button>
            <button
              onClick={onClose}
              disabled={running}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  )
}
