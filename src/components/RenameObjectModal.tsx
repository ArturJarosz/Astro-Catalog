import { useEffect, useMemo, useState } from 'react'
import {
  validateObjectName,
  type MergeProgress,
  type MergeResult,
  type ObjectInfo,
  type RenamePlan,
} from '../../electron/shared-types'
import { formatSize } from '../lib/format'

interface RenameObjectModalProps {
  object: ObjectInfo
  rootPath: string
  directoryPattern: string
  /** Re-analyse the given root-level folders after the rename so the catalogue reflects it. */
  onRenamed: (affectedTopLevelNames: string[]) => Promise<void>
  onClose: () => void
}

const PLAN_DEBOUNCE_MS = 300

export function RenameObjectModal({
  object,
  rootPath,
  directoryPattern,
  onRenamed,
  onClose,
}: RenameObjectModalProps) {
  const [newName, setNewName] = useState(object.name)
  const [plan, setPlan] = useState<RenamePlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [progress, setProgress] = useState<MergeProgress | null>(null)
  const [result, setResult] = useState<MergeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => window.astroCatalogue.onRenameProgress(setProgress), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const trimmed = newName.trim()
  const nameError = validateObjectName(newName)
  const unchanged = trimmed === object.name

  useEffect(() => {
    if (done || nameError || unchanged) {
      setPlan(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      setPlanLoading(true)
      setPlanError(null)
      window.astroCatalogue
        .buildRenamePlan(rootPath, object.path, object.isMosaic, trimmed, directoryPattern)
        .then((built) => {
          if (!cancelled) setPlan(built)
        })
        .catch((e) => {
          if (!cancelled) {
            setPlan(null)
            setPlanError(String(e))
          }
        })
        .finally(() => {
          if (!cancelled) setPlanLoading(false)
        })
    }, PLAN_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [rootPath, directoryPattern, object.path, object.isMosaic, trimmed, nameError, unchanged, done])

  const movableCount = plan ? plan.items.length - plan.collisionCount : 0
  const renamedFileCount = useMemo(
    () => (plan ? plan.items.filter((item) => item.newFileName !== item.fileName).length : 0),
    [plan],
  )

  async function runRename() {
    if (!plan || movableCount <= 0) return
    setRenaming(true)
    setError(null)
    setProgress(null)
    try {
      const renameResult = await window.astroCatalogue.executeRename(plan.items, [object.path])
      setResult(renameResult)
      setDone(true)
      await onRenamed(plan.affectedTopLevelNames)
    } catch (e) {
      setError(String(e))
    } finally {
      setRenaming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Rename “{object.name}”</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-5 text-sm">
          <p className="text-xs text-slate-400">
            Fixes files captured under the wrong target. The object folder and any file names that
            embed “{object.name}” are updated. If a folder for the new name already exists, the files
            are merged into it following the import naming rules.
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">New name</span>
            <input
              type="text"
              value={newName}
              autoFocus
              disabled={renaming || done}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && plan && movableCount > 0 && !renaming && !done) runRename()
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
            />
            {object.isMosaic && (
              <span className="text-[11px] text-slate-500">
                Mosaic object — the folder keeps its <code>_mosaic</code> suffix.
              </span>
            )}
          </label>

          <div className="min-h-[1.5rem] text-xs">
            {nameError && !unchanged && <p className="text-red-300">{nameError}</p>}
            {unchanged && <p className="text-slate-500">Type a different name to rename.</p>}
            {!nameError && !unchanged && planLoading && <p className="text-slate-400">Checking…</p>}
            {planError && <p className="text-red-300">{planError}</p>}
            {plan && !planLoading && !done && (
              <div className="space-y-1 text-slate-300">
                {plan.items.length === 0 ? (
                  <p className="text-slate-400">No files found under this object.</p>
                ) : plan.targetExists ? (
                  <p>
                    A folder named <span className="font-medium">{plan.newFolderName}</span> already
                    exists — {movableCount} file(s) will be merged into it
                    {plan.collisionCount > 0 && `, ${plan.collisionCount} skipped as duplicates`}.
                  </p>
                ) : (
                  <p>
                    {movableCount} file(s) will move to a new folder{' '}
                    <span className="font-medium">{plan.newFolderName}</span>.
                  </p>
                )}
                {renamedFileCount > 0 && (
                  <p className="text-slate-400">
                    {renamedFileCount} file name(s) rewritten to reference {plan.mainObjectName}.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runRename}
              disabled={renaming || done || !plan || movableCount <= 0}
              className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {renaming ? 'Renaming…' : done ? 'Renamed' : plan?.targetExists ? 'Merge & rename' : 'Rename'}
            </button>
            <button
              onClick={onClose}
              disabled={renaming}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {done ? 'Close' : 'Cancel'}
            </button>
          </div>

          {renaming && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all"
                  style={{
                    width:
                      progress && progress.totalBytes > 0
                        ? `${Math.round((progress.movedBytes / progress.totalBytes) * 100)}%`
                        : '0%',
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {progress
                  ? `${formatSize(progress.movedBytes)} / ${formatSize(progress.totalBytes)} · ${progress.movedFiles} / ${progress.totalFiles} files`
                  : 'Starting…'}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-300">{error}</p>}
          {result && !renaming && (
            <div className="text-sm">
              <p className="text-emerald-300">
                Moved {result.movedCount} file(s). The catalogue has been refreshed.
              </p>
              {result.skipped.length > 0 && (
                <details className="mt-1 text-xs text-slate-400">
                  <summary className="cursor-pointer">{result.skipped.length} file(s) skipped</summary>
                  <ul className="mt-1 max-h-32 overflow-y-auto pl-3 font-mono">
                    {result.skipped.map((skip) => (
                      <li key={skip.sourcePath}>
                        {skip.sourcePath} — {skip.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
