import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_SEESTAR_EXTENSIONS } from '../../electron/shared-types'
import type {
  SeestarCopyItem,
  SeestarCopyPlan,
  SeestarCopyProgress,
  SeestarSourceDirectory,
  WarningInfo,
} from '../../electron/shared-types'
import type { ConnectionStatus } from '../App'
import { formatSize } from '../lib/format'
import { WarningsPanel } from './WarningsPanel'

/** Total number of files per extension across the given directories, keyed by lower-case extension. */
function countExtensions(dirs: SeestarSourceDirectory[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const dir of dirs) {
    for (const [extension, count] of Object.entries(dir.extensionCounts)) {
      counts[extension] = (counts[extension] ?? 0) + count
    }
  }
  return counts
}

interface SeestarViewProps {
  defaultTargetDirectory: string | null
  directoryPattern: string
  status: ConnectionStatus
  onCheckConnection: () => void
  warnings: WarningInfo[]
  sourceDirectory: string
  catalogueRootPath: string | null
  reanalyzeAfterImportDefault: boolean
  onImportedDirectories: (topLevelNames: string[]) => Promise<void>
}

export function SeestarView({
  defaultTargetDirectory,
  directoryPattern,
  status,
  onCheckConnection,
  warnings,
  sourceDirectory,
  catalogueRootPath,
  reanalyzeAfterImportDefault,
  onImportedDirectories,
}: SeestarViewProps) {
  const [directories, setDirectories] = useState<SeestarSourceDirectory[] | null>(null)
  const [dirsLoading, setDirsLoading] = useState(false)
  const [dirsError, setDirsError] = useState<string | null>(null)
  const [selectedSubDirs, setSelectedSubDirs] = useState<Set<string>>(new Set())
  const [selectedExtensions, setSelectedExtensions] = useState<Set<string>>(new Set())

  const [targetDirectory, setTargetDirectory] = useState<string | null>(defaultTargetDirectory)

  const [plan, setPlan] = useState<SeestarCopyPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  const [overwrite, setOverwrite] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copyProgress, setCopyProgress] = useState<SeestarCopyProgress | null>(null)
  const [copyResult, setCopyResult] = useState<number | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [reanalyze, setReanalyze] = useState(reanalyzeAfterImportDefault)
  const [reanalyzeNotice, setReanalyzeNotice] = useState<string | null>(null)

  useEffect(() => {
    return window.astroCatalogue.onSeestarCopyProgress(setCopyProgress)
  }, [])

  const loadDirectories = useCallback(() => {
    setDirsLoading(true)
    setDirsError(null)
    setPlan(null)
    setCopyResult(null)
    window.astroCatalogue
      .listSeestarDirectories(sourceDirectory)
      .then((dirs) => {
        const subDirs = dirs.filter((d) => d.isImportable)
        setDirectories(dirs)
        setSelectedSubDirs(new Set(subDirs.map((d) => d.name)))

        const available = Object.keys(countExtensions(subDirs))
        const defaults = available.filter((ext) => DEFAULT_SEESTAR_EXTENSIONS.includes(ext))
        setSelectedExtensions(new Set(defaults.length > 0 ? defaults : available))
      })
      .catch((e) => setDirsError(String(e)))
      .finally(() => setDirsLoading(false))
  }, [sourceDirectory])

  useEffect(() => {
    setDirectories(null)
  }, [sourceDirectory])

  useEffect(() => {
    if (status === 'connected' && directories === null && !dirsLoading) {
      loadDirectories()
    }
  }, [status, directories, dirsLoading, loadDirectories])

  /** Extensions offered for import: everything present in the selected sub directories. */
  const availableExtensions = useMemo(() => {
    const selected = (directories ?? []).filter((d) => selectedSubDirs.has(d.name))
    return Object.entries(countExtensions(selected)).sort(([a], [b]) => a.localeCompare(b))
  }, [directories, selectedSubDirs])

  /** Columns of the directory table: every extension present anywhere in the source folder. */
  const extensionColumns = useMemo(
    () => Object.keys(countExtensions(directories ?? [])).sort((a, b) => a.localeCompare(b)),
    [directories],
  )

  const importExtensions = useMemo(
    () => availableExtensions.filter(([ext]) => selectedExtensions.has(ext)).map(([ext]) => ext),
    [availableExtensions, selectedExtensions],
  )

  function toggleExtension(extension: string) {
    setSelectedExtensions((prev) => {
      const next = new Set(prev)
      if (next.has(extension)) next.delete(extension)
      else next.add(extension)
      return next
    })
  }

  function toggleSubDir(name: string) {
    setSelectedSubDirs((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function chooseTargetDirectory() {
    const dir = await window.astroCatalogue.selectSeestarTargetDir()
    if (dir) setTargetDirectory(dir)
  }

  function buildPlan() {
    if (!targetDirectory || selectedSubDirs.size === 0 || importExtensions.length === 0) return
    setPlanLoading(true)
    setPlanError(null)
    setCopyResult(null)
    window.astroCatalogue
      .buildSeestarCopyPlan(
        Array.from(selectedSubDirs),
        targetDirectory,
        directoryPattern,
        sourceDirectory,
        importExtensions,
      )
      .then(setPlan)
      .catch((e) => setPlanError(String(e)))
      .finally(() => setPlanLoading(false))
  }

  const newItems = useMemo(
    () => plan?.copyItems.filter((item) => overwrite || !item.alreadyExists) ?? [],
    [plan, overwrite],
  )
  const existingCount = plan?.copyItems.filter((item) => item.alreadyExists).length ?? 0

  const destinationGroups = useMemo(() => {
    const groups = new Map<string, { destinationDirectory: string; count: number }>()
    for (const item of newItems) {
      const existing = groups.get(item.destinationDirectory)
      if (existing) existing.count += 1
      else groups.set(item.destinationDirectory, { destinationDirectory: item.destinationDirectory, count: 1 })
    }
    return Array.from(groups.values()).sort((a, b) => a.destinationDirectory.localeCompare(b.destinationDirectory))
  }, [newItems])

  async function runCopy() {
    if (newItems.length === 0) return
    if (!targetDirectory) return
    setCopying(true)
    setCopyError(null)
    setCopyProgress(null)
    setReanalyzeNotice(null)
    try {
      const items: SeestarCopyItem[] = plan?.copyItems ?? []
      const result = await window.astroCatalogue.executeSeestarCopy(items, overwrite, targetDirectory)
      setCopyResult(result.copiedCount)
      const refreshed = await window.astroCatalogue.buildSeestarCopyPlan(
        Array.from(selectedSubDirs),
        targetDirectory,
        directoryPattern,
        sourceDirectory,
        importExtensions,
      )
      setPlan(refreshed)

      if (reanalyze && result.importedTopLevelDirectories.length > 0) {
        if (targetDirectory !== catalogueRootPath) {
          setReanalyzeNotice(
            'The target directory is not the catalogue root — the catalogue was not updated.',
          )
        } else {
          try {
            await onImportedDirectories(result.importedTopLevelDirectories)
          } catch (e) {
            setReanalyzeNotice(`Re-analysis of the imported objects failed: ${String(e)}`)
          }
        }
      }
    } catch (e) {
      setCopyError(String(e))
    } finally {
      setCopying(false)
    }
  }

  if (status !== 'connected') {
    return (
      <div className="space-y-6">
        <WarningsPanel warnings={warnings} />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24 text-center">
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${status === 'checking' ? 'animate-pulse bg-slate-500' : 'bg-red-400'}`}
          />
          <span className="text-base text-slate-200">
            {status === 'checking' ? 'Checking for Seestar…' : 'Seestar not connected'}
          </span>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          {status === 'disconnected'
            ? `Couldn't reach ${sourceDirectory} on the network`
            : `Looking for ${sourceDirectory}`}
        </p>
        <button
          onClick={onCheckConnection}
          disabled={status === 'checking'}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'checking' ? 'Checking…' : 'Check again'}
        </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <WarningsPanel warnings={warnings} />
      <div className="flex items-center gap-2 text-sm text-slate-200">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        Seestar connected
        <button onClick={onCheckConnection} className="ml-2 text-xs text-slate-400 underline hover:text-slate-200">
          re-check
        </button>
      </div>

      <section className="rounded-xl border border-white/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Source directories</h2>
          <button
            onClick={loadDirectories}
            disabled={dirsLoading}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {dirsLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {dirsError && <p className="text-sm text-red-300">{dirsError}</p>}

        {directories && directories.length === 0 && (
          <p className="text-sm text-slate-400">No directories found in the Seestar source folder.</p>
        )}

        {directories && directories.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="w-8 py-1"></th>
                  <th className="py-1">Directory</th>
                  <th className="py-1 text-right">Files</th>
                  {extensionColumns.map((ext) => (
                    <th key={ext} className="py-1 text-right">
                      {ext.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {directories.map((dir) => (
                  <tr key={dir.name} className="border-t border-white/5">
                    <td className="py-1.5">
                      {dir.isImportable && (
                        <input
                          type="checkbox"
                          checked={selectedSubDirs.has(dir.name)}
                          onChange={() => toggleSubDir(dir.name)}
                        />
                      )}
                    </td>
                    <td className="py-1.5 text-slate-200">
                      {dir.name}
                      {!dir.isImportable && (
                        <span className="ml-2 text-xs text-slate-400">(not a _sub or _video folder)</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-300">{dir.totalFiles}</td>
                    {extensionColumns.map((ext) => (
                      <td key={ext} className="py-1.5 text-right tabular-nums text-slate-300">
                        {dir.extensionCounts[ext] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">File types to import</h2>
          {availableExtensions.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <button
                onClick={() => setSelectedExtensions(new Set(availableExtensions.map(([ext]) => ext)))}
                className="underline hover:text-slate-200"
              >
                select all
              </button>
              <button onClick={() => setSelectedExtensions(new Set())} className="underline hover:text-slate-200">
                select none
              </button>
            </div>
          )}
        </div>

        {availableExtensions.length === 0 ? (
          <p className="text-sm text-slate-400">
            {selectedSubDirs.size === 0 ? 'Select a source directory first.' : 'No files found in the selected directories.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {availableExtensions.map(([extension, count]) => (
              <label key={extension} className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={selectedExtensions.has(extension)}
                  onChange={() => toggleExtension(extension)}
                />
                <span className="font-mono">.{extension}</span>
                <span className="text-xs text-slate-400">({count})</span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Target directory</h2>
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-200">
            {targetDirectory ?? 'No target directory selected'}
          </span>
          <button
            onClick={chooseTargetDirectory}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Choose…
          </button>
        </div>
      </section>

      <div>
        <button
          onClick={buildPlan}
          disabled={!targetDirectory || selectedSubDirs.size === 0 || importExtensions.length === 0 || planLoading}
          className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {planLoading ? 'Building plan…' : 'Build copy plan'}
        </button>
        {planError && <p className="mt-2 text-sm text-red-300">{planError}</p>}
      </div>

      {plan && (
        <section className="space-y-4 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Sub directory summary</h2>
          {plan.subDirSummaries.map((summary) => (
            <div key={summary.name}>
              <p className="text-sm text-slate-200">{summary.name}</p>
              {summary.groups.length === 0 ? (
                <p className="pl-3 text-xs text-slate-400">No matching files.</p>
              ) : (
                <ul className="pl-3 text-xs text-slate-400">
                  {summary.groups.map((g) => (
                    <li key={`${g.targetDate}-${g.type}-${g.targetExposure}-${g.extension}`}>
                      {g.targetDate} {g.type} {g.targetExposure}: {g.count} {g.extension} files
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {plan.invalidFiles.length > 0 && (
            <div>
              <p className="text-sm text-amber-300">
                {plan.invalidFiles.length} file(s) skipped — name doesn't match the expected pattern
              </p>
              <ul className="max-h-32 overflow-y-auto pl-3 text-xs text-slate-400">
                {plan.invalidFiles.map((f) => (
                  <li key={`${f.subDirectory}/${f.fileName}`}>
                    [{f.subDirectory}] {f.fileName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-white/10 pt-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
              Copy plan ({importExtensions.map((ext) => `.${ext}`).join(', ')})
            </h3>
            {destinationGroups.length === 0 ? (
              <p className="text-sm text-slate-400">No new files to copy.</p>
            ) : (
              <ul className="text-xs text-slate-300">
                {destinationGroups.map((g) => (
                  <li key={g.destinationDirectory}>
                    {g.count} file(s) → {g.destinationDirectory}
                  </li>
                ))}
              </ul>
            )}
            {existingCount > 0 && !overwrite && (
              <p className="mt-2 text-xs text-slate-400">
                {existingCount} file(s) already exist in the target and will be skipped.
              </p>
            )}

            <label className="mt-3 flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
              Overwrite existing files
            </label>

            <label className="mt-2 flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={reanalyze} onChange={(e) => setReanalyze(e.target.checked)} />
              Re-analyse imported objects after the import
            </label>

            <button
              onClick={runCopy}
              disabled={copying || newItems.length === 0}
              className="mt-3 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copying ? 'Copying…' : `Copy ${newItems.length} file(s)`}
            </button>

            {copying && (
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all"
                    style={{
                      width:
                        copyProgress && copyProgress.totalBytes > 0
                          ? `${Math.round((copyProgress.copiedBytes / copyProgress.totalBytes) * 100)}%`
                          : '0%',
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {copyProgress
                    ? `${formatSize(copyProgress.copiedBytes)} / ${formatSize(copyProgress.totalBytes)} · ${copyProgress.copiedFiles} / ${copyProgress.totalFiles} files — ${copyProgress.fileName}`
                    : 'Starting…'}
                </p>
              </div>
            )}
            {copyError && <p className="mt-2 text-sm text-red-300">{copyError}</p>}
            {copyResult !== null && !copying && (
              <p className="mt-2 text-sm text-emerald-300">Copied {copyResult} file(s).</p>
            )}
            {reanalyzeNotice && <p className="mt-2 text-sm text-amber-300">{reanalyzeNotice}</p>}
          </div>
        </section>
      )}
    </div>
  )
}
