import { useEffect, useMemo, useState } from 'react'
import type { MergePlan, MergeProgress, MergeResult, ObjectInfo } from '../../electron/shared-types'
import { defaultMainObject, type DuplicateTargetGroup } from '../lib/duplicateTargets'
import { formatExposure, formatSize } from '../lib/format'

interface MergeTargetsModalProps {
  groups: DuplicateTargetGroup[]
  rootPath: string
  directoryPattern: string
  allObjects: ObjectInfo[]
  manualLinks: string[][]
  onAddManualLink: (paths: string[]) => void
  onRemoveManualLink: (index: number) => void
  /** Re-analyse the given root-level folders after a merge so the catalogue reflects it. */
  onMerged: (affectedTopLevelNames: string[]) => Promise<void>
  onClose: () => void
}

function objectFrameCount(object: ObjectInfo): number {
  return object.frameTypes.reduce((sum, ft) => sum + ft.totalFrames, 0)
}

function objectExposureSeconds(object: ObjectInfo): number {
  return object.frameTypes.reduce((sum, ft) => sum + ft.totalExposureSeconds, 0)
}

function relativeToRoot(rootPath: string, absolutePath: string): string {
  if (absolutePath === rootPath) return '.'
  const withSep = rootPath.endsWith('/') || rootPath.endsWith('\\') ? rootPath : `${rootPath}/`
  return absolutePath.startsWith(withSep) ? absolutePath.slice(withSep.length) : absolutePath
}

function GroupMergeCard({
  group,
  rootPath,
  directoryPattern,
  onMerged,
}: {
  group: DuplicateTargetGroup
  rootPath: string
  directoryPattern: string
  onMerged: (affectedTopLevelNames: string[]) => Promise<void>
}) {
  const [mainPath, setMainPath] = useState(() => defaultMainObject(group.objects).path)
  const [plan, setPlan] = useState<MergePlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)
  const [progress, setProgress] = useState<MergeProgress | null>(null)
  const [result, setResult] = useState<MergeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const otherObjects = useMemo(
    () => group.objects.filter((object) => object.path !== mainPath),
    [group.objects, mainPath],
  )

  useEffect(() => window.astroCatalogue.onMergeProgress(setProgress), [])

  useEffect(() => {
    if (done) return
    let cancelled = false
    setPlanLoading(true)
    setPlanError(null)
    setResult(null)
    window.astroCatalogue
      .buildMergePlan(rootPath, mainPath, otherObjects.map((object) => object.path), directoryPattern)
      .then((built) => {
        if (!cancelled) setPlan(built)
      })
      .catch((e) => {
        if (!cancelled) setPlanError(String(e))
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [rootPath, directoryPattern, mainPath, otherObjects, done])

  const movableCount = plan ? plan.items.length - plan.collisionCount : 0
  const renamedCount = plan ? plan.items.filter((item) => item.newFileName !== item.fileName).length : 0

  const sourceSummaries = useMemo(() => {
    if (!plan) return []
    const bySource = new Map<string, { source: string; fileCount: number; destinations: Set<string> }>()
    for (const item of plan.items) {
      const entry = bySource.get(item.sourceObject) ?? {
        source: item.sourceObject,
        fileCount: 0,
        destinations: new Set<string>(),
      }
      entry.fileCount += 1
      entry.destinations.add(item.destinationDirectory)
      bySource.set(item.sourceObject, entry)
    }
    return Array.from(bySource.values()).sort((a, b) => a.source.localeCompare(b.source))
  }, [plan])

  async function runMerge() {
    if (!plan || movableCount <= 0) return
    setMerging(true)
    setError(null)
    setProgress(null)
    try {
      const mergeResult = await window.astroCatalogue.executeMerge(
        plan.items,
        otherObjects.map((object) => object.path),
      )
      setResult(mergeResult)
      setDone(true)
      await onMerged(plan.affectedTopLevelNames)
    } catch (e) {
      setError(String(e))
    } finally {
      setMerging(false)
    }
  }

  return (
    <section className="rounded-xl border border-white/10 p-4">
      <h3 className="text-sm font-semibold text-slate-100">{group.aliasLabel}</h3>
      <p className="mt-1 text-xs text-slate-400">
        Choose the folder to keep. Files from the others are moved into it, renamed to match, and the
        emptied folders are removed.
      </p>

      <div className="mt-3 space-y-1.5">
        {group.objects.map((object) => (
          <label
            key={object.path}
            className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name={`main-${group.signature}`}
              className="mt-0.5"
              checked={object.path === mainPath}
              disabled={merging || done}
              onChange={() => setMainPath(object.path)}
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-slate-100">{object.name}</span>
                <span className="text-xs tabular-nums text-slate-400">
                  {objectFrameCount(object)} frames · {formatExposure(objectExposureSeconds(object))}
                </span>
                {object.path === mainPath && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 text-[10px] font-medium text-emerald-300">
                    keep
                  </span>
                )}
              </span>
              <span className="block truncate font-mono text-[11px] text-slate-500">
                {relativeToRoot(rootPath, object.path)}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-3 border-t border-white/10 pt-3 text-xs">
        {planLoading && <p className="text-slate-400">Building merge plan…</p>}
        {planError && <p className="text-red-300">{planError}</p>}
        {plan && !planLoading && (
          <>
            {plan.items.length === 0 ? (
              <p className="text-slate-400">Nothing to move — the other folder(s) hold no matching files.</p>
            ) : (
              <ul className="space-y-1 text-slate-300">
                {sourceSummaries.map((summary) => (
                  <li key={summary.source}>
                    {summary.fileCount} file(s) from <span className="font-medium">{summary.source}</span> →{' '}
                    {summary.destinations.size === 1
                      ? relativeToRoot(rootPath, [...summary.destinations][0])
                      : `${summary.destinations.size} session folders under ${plan.mainObjectName}`}
                  </li>
                ))}
              </ul>
            )}
            {renamedCount > 0 && (
              <p className="mt-1 text-slate-400">
                {renamedCount} file name(s) rewritten to reference {plan.mainObjectName}.
              </p>
            )}
            {plan.collisionCount > 0 && (
              <p className="mt-1 text-amber-300">
                {plan.collisionCount} file(s) already exist under {plan.mainObjectName} and will be skipped.
              </p>
            )}
          </>
        )}
      </div>

      <button
        onClick={runMerge}
        disabled={merging || done || !plan || movableCount <= 0}
        className="mt-3 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {merging ? 'Merging…' : done ? 'Merged' : `Merge ${movableCount} file(s) into ${plan?.mainObjectName ?? '…'}`}
      </button>

      {merging && (
        <div className="mt-3">
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

      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      {result && !merging && (
        <div className="mt-2 text-sm">
          <p className="text-emerald-300">
            Moved {result.movedCount} file(s). The catalogue has been refreshed.
          </p>
          {result.skipped.length > 0 && (
            <details className="mt-1 text-xs text-slate-400">
              <summary className="cursor-pointer">{result.skipped.length} file(s) skipped</summary>
              <ul className="mt-1 max-h-32 overflow-y-auto pl-3 font-mono">
                {result.skipped.map((skip) => (
                  <li key={skip.sourcePath}>
                    {relativeToRoot(rootPath, skip.sourcePath)} — {skip.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  )
}

function ManualLinkSection({
  allObjects,
  groupedPaths,
  manualLinks,
  onAddManualLink,
  onRemoveManualLink,
}: {
  allObjects: ObjectInfo[]
  groupedPaths: Set<string>
  manualLinks: string[][]
  onAddManualLink: (paths: string[]) => void
  onRemoveManualLink: (index: number) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const nameByPath = useMemo(
    () => new Map(allObjects.map((object) => [object.path, object.name])),
    [allObjects],
  )
  const linkable = allObjects.filter((object) => !groupedPaths.has(object.path))

  function toggle(objectPath: string) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(objectPath)) next.delete(objectPath)
      else next.add(objectPath)
      return next
    })
  }

  return (
    <section className="rounded-xl border border-white/10 p-4">
      <h3 className="text-sm font-semibold text-slate-100">Manually link folders</h3>
      <p className="mt-1 text-xs text-slate-400">
        For targets the app can't match automatically (custom names with no catalogue coordinates).
        Linked folders then merge just like an auto-detected group.
      </p>

      {manualLinks.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {manualLinks.map((link, index) => (
            <li key={link.join('|')} className="flex items-center gap-2">
              <span className="flex-1 text-slate-300">
                {link.map((objectPath) => nameByPath.get(objectPath) ?? objectPath).join(' / ')}
              </span>
              <button
                onClick={() => onRemoveManualLink(index)}
                className="rounded border border-white/10 px-2 py-0.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
              >
                Unlink
              </button>
            </li>
          ))}
        </ul>
      )}

      {linkable.length < 2 ? (
        <p className="mt-3 text-xs text-slate-400">Not enough unlinked folders to create a link.</p>
      ) : (
        <>
          <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
            {linkable.map((object) => (
              <label key={object.path} className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={selected.has(object.path)}
                  onChange={() => toggle(object.path)}
                />
                <span>{object.name}</span>
                <span className="truncate font-mono text-[11px] text-slate-500">{object.path}</span>
              </label>
            ))}
          </div>
          <button
            onClick={() => {
              onAddManualLink([...selected])
              setSelected(new Set())
            }}
            disabled={selected.size < 2}
            className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Link {selected.size || ''} selected folder(s) as one target
          </button>
        </>
      )}
    </section>
  )
}

export function MergeTargetsModal({
  groups,
  rootPath,
  directoryPattern,
  allObjects,
  manualLinks,
  onAddManualLink,
  onRemoveManualLink,
  onMerged,
  onClose,
}: MergeTargetsModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const groupedPaths = useMemo(
    () => new Set(groups.flatMap((group) => group.objects.map((object) => object.path))),
    [groups],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Merge duplicate targets</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          {groups.length === 0 ? (
            <p className="text-sm text-slate-400">No duplicate targets detected in the catalogue.</p>
          ) : (
            groups.map((group) => (
              <GroupMergeCard
                key={group.signature}
                group={group}
                rootPath={rootPath}
                directoryPattern={directoryPattern}
                onMerged={onMerged}
              />
            ))
          )}

          <ManualLinkSection
            allObjects={allObjects}
            groupedPaths={groupedPaths}
            manualLinks={manualLinks}
            onAddManualLink={onAddManualLink}
            onRemoveManualLink={onRemoveManualLink}
          />
        </div>
      </div>
    </div>
  )
}
