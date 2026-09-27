import fs from 'node:fs'
import path from 'node:path'
import { buildRelocationPlan, executeMerge } from './merge'
import { DEFAULT_SEESTAR_DIRECTORY_PATTERN, validateObjectName, type RenamePlan } from './shared-types'

const MOSAIC_SUFFIX = '_mosaic'

/**
 * Plans a rename of one catalogue object. Renaming is a relocation of the object's files
 * into a folder for the new name (CLAUDE.md rules 3–5, 10):
 *  - if `<root>/<newFolderName>` doesn't exist, the files land in a fresh folder tree;
 *  - if it does, they merge into it, colliding files skipped.
 * A trailing `_mosaic` marker is preserved so mosaic status survives the rename (rule 5).
 */
export function buildRenamePlan(
  rootPath: string,
  objectPath: string,
  isMosaic: boolean,
  newName: string,
  directoryPattern: string = DEFAULT_SEESTAR_DIRECTORY_PATTERN,
): RenamePlan {
  const trimmed = newName.trim()
  const nameError = validateObjectName(trimmed)
  if (nameError) throw new Error(nameError)

  const oldFolderName = path.basename(objectPath)
  const oldBareName =
    isMosaic && oldFolderName.toLowerCase().endsWith(MOSAIC_SUFFIX)
      ? oldFolderName.slice(0, -MOSAIC_SUFFIX.length)
      : oldFolderName
  const newFolderName = isMosaic ? `${trimmed}${MOSAIC_SUFFIX}` : trimmed

  if (newFolderName === oldFolderName) throw new Error('That is already the object name.')

  const targetExists = fs.existsSync(path.join(rootPath, newFolderName))

  const plan = buildRelocationPlan(
    rootPath,
    newFolderName,
    trimmed,
    [{ objectPath, sourceName: oldBareName }],
    directoryPattern,
  )

  return { ...plan, targetExists, newFolderName, oldFolderName }
}

/** Renaming moves files exactly like a merge, so it reuses the merge executor. */
export const executeRename = executeMerge
