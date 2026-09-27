import fs from 'node:fs'
import path from 'node:path'
import { applyDirectoryPattern } from './directory-pattern'
import { collectObjectLeafFiles } from './scanner'
import { copyFileStreaming } from './seestar'
import {
  DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  type MergeMoveItem,
  type MergePlan,
  type MergeProgress,
  type MergeResult,
} from './shared-types'

const PROGRESS_THROTTLE_MS = 150

/** The root-level folder name a path lives under (the object folder, per application.md). */
function topLevelName(rootPath: string, target: string): string {
  const relative = path.relative(rootPath, target)
  return relative.split(path.sep)[0] || path.basename(target)
}

/**
 * Swaps a whole-word occurrence of the source target name in a file name for the main one,
 * e.g. "Light_NGC 224_20s_LP_20260809-120000.fit" → "Light_M 31_20s_LP_20260809-120000.fit".
 * Left untouched when the source name isn't embedded (or isn't bounded by non-alphanumerics,
 * so "IC 5" never matches inside "IC 59").
 */
function renameForMainTarget(fileName: string, sourceName: string, mainName: string): string {
  if (!sourceName || sourceName === mainName) return fileName
  const haystack = fileName.toLowerCase()
  const needle = sourceName.toLowerCase()
  const isAlnum = (ch: string) => /[A-Za-z0-9]/.test(ch)

  for (let from = 0; from <= haystack.length; ) {
    const index = haystack.indexOf(needle, from)
    if (index === -1) return fileName
    const before = index === 0 ? '' : fileName[index - 1]
    const after = fileName[index + sourceName.length] ?? ''
    if ((before === '' || !isAlnum(before)) && (after === '' || !isAlnum(after))) {
      return fileName.slice(0, index) + mainName + fileName.slice(index + sourceName.length)
    }
    from = index + sourceName.length
  }
  return fileName
}

/** One object folder to relocate, plus the whole-word name to swap out of its file names. */
export interface RelocationSource {
  /** Absolute path of the object folder whose files are moved. */
  objectPath: string
  /** Name looked for as a whole word in each file name and swapped for `mainNameForFiles`. */
  sourceName: string
}

/**
 * Core planner shared by "merge duplicate objects" and "rename object" (CLAUDE.md rule 1).
 * Files from every source object folder are relocated into `mainFolderName`'s directory-pattern
 * tree under the root. `mainFolderName` is the destination top-level folder (it may carry a
 * `_mosaic` suffix and need not exist on disk yet); `mainNameForFiles` is the bare object name
 * substituted into file names.
 */
export function buildRelocationPlan(
  rootPath: string,
  mainFolderName: string,
  mainNameForFiles: string,
  sources: RelocationSource[],
  directoryPattern: string = DEFAULT_SEESTAR_DIRECTORY_PATTERN,
): MergePlan {
  const items: MergeMoveItem[] = []
  const affected = new Set<string>([mainFolderName])

  for (const source of sources) {
    affected.add(topLevelName(rootPath, source.objectPath))

    for (const leaf of collectObjectLeafFiles(source.objectPath, directoryPattern)) {
      const destinationDirectory = path.join(
        rootPath,
        ...applyDirectoryPattern(directoryPattern, {
          object: mainFolderName,
          type: leaf.type,
          date: leaf.date,
          exposure: leaf.exposure,
        }),
      )

      for (const fileName of leaf.fileNames) {
        const newFileName = renameForMainTarget(fileName, source.sourceName, mainNameForFiles)
        const sourcePath = path.join(leaf.folderPath, fileName)
        const destinationPath = path.join(destinationDirectory, newFileName)
        items.push({
          sourcePath,
          destinationPath,
          destinationDirectory,
          fileName,
          newFileName,
          sourceObject: source.sourceName,
          type: leaf.type,
          date: leaf.date,
          exposure: leaf.exposure,
          alreadyExists: sourcePath !== destinationPath && fs.existsSync(destinationPath),
          sizeBytes: fs.statSync(sourcePath).size,
        })
      }
    }
  }

  return {
    mainObjectName: mainNameForFiles,
    items,
    collisionCount: items.filter((item) => item.alreadyExists).length,
    affectedTopLevelNames: Array.from(affected).sort((a, b) => a.localeCompare(b)),
  }
}

export function buildMergePlan(
  rootPath: string,
  mainObjectPath: string,
  otherObjectPaths: string[],
  directoryPattern: string = DEFAULT_SEESTAR_DIRECTORY_PATTERN,
): MergePlan {
  const mainName = topLevelName(rootPath, mainObjectPath)
  return buildRelocationPlan(
    rootPath,
    mainName,
    mainName,
    otherObjectPaths.map((otherPath) => ({
      objectPath: otherPath,
      sourceName: topLevelName(rootPath, otherPath),
    })),
    directoryPattern,
  )
}

async function moveFile(sourcePath: string, destinationPath: string): Promise<void> {
  try {
    fs.renameSync(sourcePath, destinationPath)
  } catch (err) {
    // rename can't cross filesystems — fall back to a streamed copy + delete.
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err
    await copyFileStreaming(sourcePath, destinationPath, () => {})
    fs.unlinkSync(sourcePath)
  }
}

/** Removes `dir` and every directory below it that is (or becomes) empty, bottom-up. */
function pruneEmptyDirs(dir: string): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.isDirectory()) pruneEmptyDirs(path.join(dir, entry.name))
  }
  try {
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir)
  } catch {
    /* a non-empty or vanished directory is fine to leave alone */
  }
}

export async function executeMerge(
  items: MergeMoveItem[],
  sourceObjectPaths: string[],
  onProgress?: (progress: MergeProgress) => void,
): Promise<MergeResult> {
  const toMove = items.filter((item) => !item.alreadyExists)
  const skipped: MergeResult['skipped'] = items
    .filter((item) => item.alreadyExists)
    .map((item) => ({ sourcePath: item.sourcePath, reason: 'a file already exists at the destination' }))

  for (const dir of new Set(toMove.map((item) => item.destinationDirectory))) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const totalFiles = toMove.length
  const totalBytes = toMove.reduce((sum, item) => sum + item.sizeBytes, 0)
  let movedFiles = 0
  let movedBytes = 0
  let lastEmitAt = 0

  function emit(fileName: string, force = false) {
    const now = Date.now()
    if (!force && now - lastEmitAt < PROGRESS_THROTTLE_MS) return
    lastEmitAt = now
    onProgress?.({ movedFiles, totalFiles, movedBytes, totalBytes, fileName })
  }

  for (const item of toMove) {
    // Re-check: an earlier item in this same plan may have just landed here.
    if (fs.existsSync(item.destinationPath)) {
      skipped.push({ sourcePath: item.sourcePath, reason: 'a file already exists at the destination' })
      continue
    }
    await moveFile(item.sourcePath, item.destinationPath)
    movedFiles += 1
    movedBytes += item.sizeBytes
    emit(item.newFileName)
  }
  emit('', true)

  for (const sourcePath of sourceObjectPaths) pruneEmptyDirs(sourcePath)

  return { movedCount: movedFiles, skipped }
}
