import fs from 'node:fs/promises'
import path from 'node:path'
import {
  DEFAULT_OBJECT_IMAGE_DISPLAY,
  parseObjectImageDisplay,
  type ObjectImageDisplay,
  type ObjectImageEntry,
} from './shared-types'

/**
 * User-provided object pictures live flat inside the configured "Object images" folder:
 *  - `<object>.<ext>` is the primary picture (implicitly number 1), used as the object's thumbnail;
 *  - `<object>(2).<ext>`, `<object>(3).<ext>`, … are further pictures of the same object.
 * Brackets (not `-N`) keep the numbering apart from catalogue names such as `Sh2-155`.
 * Choosing another thumbnail swaps file names with the primary. The only other state is how each
 * picture is displayed (full / crop), kept in the DISPLAY_SETTINGS_FILE sidecar next to the pictures
 * and keyed by file name, so every rename below carries its entry along.
 */
export const LOCAL_OBJECT_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png']

/**
 * Pictures are served to the renderer through this custom protocol (registered in `main.ts`)
 * rather than `file://`: in dev the renderer is an http://localhost page, and Chromium refuses
 * to load `file://` resources from http origins.
 */
export const OBJECT_IMAGE_SCHEME = 'object-image'

function objectImageUrl(filePath: string, version: string): string {
  return `${OBJECT_IMAGE_SCHEME}://local/${encodeURIComponent(filePath)}?v=${version}`
}

/** Absolute file path behind an object-image URL, or null if it isn't a supported picture. */
export function objectImagePathFromUrl(url: string): string | null {
  const { pathname } = new URL(url)
  const filePath = decodeURIComponent(pathname.slice(1))
  if (!path.isAbsolute(filePath)) return null
  return LOCAL_OBJECT_IMAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase()) ? filePath : null
}

const DISPLAY_SETTINGS_FILE = '.astro-catalogue-images.json'

type DisplaySettings = Record<string, ObjectImageDisplay>

async function readDisplaySettings(imagesPath: string): Promise<DisplaySettings> {
  let raw: unknown
  try {
    raw = JSON.parse(await fs.readFile(path.join(imagesPath, DISPLAY_SETTINGS_FILE), 'utf8'))
  } catch {
    return {}
  }
  const displays = (raw as { displays?: unknown } | null)?.displays
  if (!displays || typeof displays !== 'object') return {}
  const settings: DisplaySettings = {}
  for (const [fileName, value] of Object.entries(displays)) {
    const display = parseObjectImageDisplay(value)
    if (display) settings[fileName] = display
  }
  return settings
}

async function updateDisplaySettings(imagesPath: string, update: (settings: DisplaySettings) => void) {
  const settings = await readDisplaySettings(imagesPath)
  const before = JSON.stringify(settings)
  update(settings)
  if (JSON.stringify(settings) === before) return
  const filePath = path.join(imagesPath, DISPLAY_SETTINGS_FILE)
  await fs.writeFile(`${filePath}.tmp`, JSON.stringify({ version: 1, displays: settings }, null, 2))
  await fs.rename(`${filePath}.tmp`, filePath)
}

/** Moves (or with `keep`, copies) display entries along with renamed files: `[from, to]` pairs. */
async function carryDisplaySettings(imagesPath: string, renames: Array<[string, string]>, keep = false) {
  await updateDisplaySettings(imagesPath, (settings) => {
    const carried = renames.map(([from, to]) => [to, settings[from]] as const)
    if (!keep) for (const [from] of renames) delete settings[from]
    for (const [to, display] of carried) {
      if (display) settings[to] = display
      else delete settings[to]
    }
  })
}

// Bumped on every change to the images folder made through this module. Renames keep a file's
// mtime, so the revision (not just mtime) is what makes swapped URLs differ for Chromium's cache.
let imagesRevision = 0

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function objectImagePattern(objectName: string): RegExp {
  const extensions = LOCAL_OBJECT_IMAGE_EXTENSIONS.map((ext) => escapeRegExp(ext.slice(1))).join('|')
  return new RegExp(`^${escapeRegExp(objectName)}(?:\\((\\d+)\\))?\\.(?:${extensions})$`, 'i')
}

/** Index of an image file belonging to `objectName` (0 for the primary), or null if it isn't one. */
function imageIndex(objectName: string, fileName: string): number | null {
  const match = objectImagePattern(objectName).exec(fileName)
  if (!match) return null
  return match[1] === undefined ? 0 : Number(match[1])
}

function assertObjectImage(objectName: string, fileName: string): number {
  const index = path.basename(fileName) === fileName ? imageIndex(objectName, fileName) : null
  if (index === null) throw new Error(`"${fileName}" is not an image of ${objectName}.`)
  return index
}

function assertObjectName(objectName: string) {
  if (!objectName || /[\\/]/.test(objectName)) throw new Error(`Invalid object name "${objectName}".`)
}

async function exists(filePath: string): Promise<boolean> {
  return fs.access(filePath).then(
    () => true,
    () => false,
  )
}

/** All images of an object, primary first, then by index. */
export async function listObjectImages(imagesPath: string, objectName: string): Promise<ObjectImageEntry[]> {
  if (!imagesPath || !objectName) return []
  let entries: string[]
  try {
    entries = await fs.readdir(imagesPath)
  } catch {
    return []
  }
  const matches = entries
    .map((fileName) => ({ fileName, index: imageIndex(objectName, fileName) }))
    .filter((entry): entry is { fileName: string; index: number } => entry.index !== null)
    .sort((a, b) => a.index - b.index || a.fileName.localeCompare(b.fileName))

  const displays = matches.length > 0 ? await readDisplaySettings(imagesPath) : {}
  const images: ObjectImageEntry[] = []
  for (const { fileName, index } of matches) {
    const filePath = path.join(imagesPath, fileName)
    const stat = await fs.stat(filePath).catch(() => null)
    if (!stat?.isFile()) continue
    // The query defeats Chromium's image cache after files are replaced or swapped.
    const url = objectImageUrl(filePath, `${Math.round(stat.mtimeMs)}-${imagesRevision}`)
    images.push({ fileName, url, index, isPrimary: false, display: displays[fileName] ?? DEFAULT_OBJECT_IMAGE_DISPLAY })
  }
  if (images.length > 0 && images[0].index === 0) images[0].isPrimary = true
  return images
}

/** The object's primary image, or null when it has none. */
export async function getPrimaryObjectImage(imagesPath: string, objectName: string): Promise<ObjectImageEntry | null> {
  const [first] = await listObjectImages(imagesPath, objectName)
  return first?.isPrimary ? first : null
}

/** Saves how one picture is displayed (full / crop area). */
export async function setObjectImageDisplay(
  imagesPath: string,
  objectName: string,
  fileName: string,
  display: unknown,
): Promise<void> {
  assertObjectName(objectName)
  assertObjectImage(objectName, fileName)
  const parsed = parseObjectImageDisplay(display)
  if (!parsed) throw new Error('Invalid display setting.')
  if (!(await exists(path.join(imagesPath, fileName)))) throw new Error(`"${fileName}" no longer exists.`)
  imagesRevision += 1
  await updateDisplaySettings(imagesPath, (settings) => {
    settings[fileName] = parsed
  })
}

function nextFreeIndex(images: ObjectImageEntry[]): number {
  return images.reduce((max, image) => Math.max(max, image.index), 1) + 1
}

/**
 * Copies the given files into the images folder under the object's name. The first one becomes
 * the primary if the object has none yet; the rest get `(N)` suffixes (from 2) after the highest existing one.
 * Returns the new file names.
 */
export async function addObjectImages(imagesPath: string, objectName: string, sourcePaths: string[]): Promise<string[]> {
  assertObjectName(objectName)
  if (!imagesPath) throw new Error('No object images folder is configured.')
  for (const sourcePath of sourcePaths) {
    const ext = path.extname(sourcePath).toLowerCase()
    if (!LOCAL_OBJECT_IMAGE_EXTENSIONS.includes(ext)) {
      throw new Error(`"${path.basename(sourcePath)}" is not a supported image (${LOCAL_OBJECT_IMAGE_EXTENSIONS.join(', ')}).`)
    }
  }
  await fs.mkdir(imagesPath, { recursive: true })
  imagesRevision += 1

  const images = await listObjectImages(imagesPath, objectName)
  let hasPrimary = images.some((image) => image.isPrimary)
  let index = nextFreeIndex(images)
  const added: string[] = []
  for (const sourcePath of sourcePaths) {
    const ext = path.extname(sourcePath).toLowerCase()
    let fileName: string
    if (!hasPrimary) {
      fileName = `${objectName}${ext}`
      hasPrimary = true
    } else {
      fileName = `${objectName}(${index})${ext}`
      index += 1
    }
    // COPYFILE_EXCL: never overwrite an existing picture.
    await fs.copyFile(sourcePath, path.join(imagesPath, fileName), fs.constants.COPYFILE_EXCL)
    added.push(fileName)
  }
  return added
}

/**
 * Makes `fileName` the object's primary image by swapping names with the current primary: the
 * chosen file becomes `<object>.<its ext>`, the old primary takes the chosen file's `(N)` slot
 * (keeping its own extension).
 */
export async function setPrimaryObjectImage(imagesPath: string, objectName: string, fileName: string): Promise<void> {
  assertObjectName(objectName)
  const chosenIndex = assertObjectImage(objectName, fileName)
  const images = await listObjectImages(imagesPath, objectName)
  const chosen = images.find((image) => image.fileName === fileName)
  if (!chosen) throw new Error(`"${fileName}" no longer exists.`)
  const primary = images.find((image) => image.isPrimary)
  if (primary?.fileName === fileName) return

  const chosenPath = path.join(imagesPath, fileName)
  const newChosenPath = path.join(imagesPath, `${objectName}${path.extname(fileName).toLowerCase()}`)
  if (!primary) {
    imagesRevision += 1
    await fs.rename(chosenPath, newChosenPath)
    await carryDisplaySettings(imagesPath, [[fileName, path.basename(newChosenPath)]])
    return
  }

  const demotedIndex = chosenIndex > 0 ? chosenIndex : nextFreeIndex(images)
  const primaryPath = path.join(imagesPath, primary.fileName)
  const demotedPath = path.join(imagesPath, `${objectName}(${demotedIndex})${path.extname(primary.fileName).toLowerCase()}`)
  if (path.basename(demotedPath) !== fileName && (await exists(demotedPath))) {
    throw new Error(`Cannot swap: "${path.basename(demotedPath)}" already exists.`)
  }

  imagesRevision += 1
  const tempPath = path.join(imagesPath, `.${objectName}-swap-${Date.now()}.tmp`)
  await fs.rename(primaryPath, tempPath)
  try {
    await fs.rename(chosenPath, newChosenPath)
  } catch (error) {
    await fs.rename(tempPath, primaryPath)
    throw error
  }
  await fs.rename(tempPath, demotedPath)
  await carryDisplaySettings(imagesPath, [
    [fileName, path.basename(newChosenPath)],
    [primary.fileName, path.basename(demotedPath)],
  ])
}

/**
 * Removes one image via `trash` (the OS trash, so it is recoverable). When the primary is
 * removed, the lowest-numbered remaining image is promoted so the object keeps a thumbnail.
 */
export async function deleteObjectImage(
  imagesPath: string,
  objectName: string,
  fileName: string,
  trash: (filePath: string) => Promise<void>,
): Promise<void> {
  assertObjectName(objectName)
  const index = assertObjectImage(objectName, fileName)
  imagesRevision += 1
  await trash(path.join(imagesPath, fileName))
  await updateDisplaySettings(imagesPath, (settings) => {
    delete settings[fileName]
  })
  if (index !== 0) return

  const remaining = await listObjectImages(imagesPath, objectName)
  if (remaining.length === 0 || remaining[0].isPrimary) return
  await setPrimaryObjectImage(imagesPath, objectName, remaining[0].fileName)
}

/**
 * Carries an object's pictures over to another object name after a rename or merge: the source
 * primary becomes the target's primary if it has none, everything else is appended after the
 * target's highest number. `keepSource` copies instead of moving — used when another catalogue
 * object (e.g. the `_mosaic` sibling) still goes by the old name and shares its pictures.
 * Never overwrites; returns the new file names.
 */
export async function relocateObjectImages(
  imagesPath: string,
  fromName: string,
  toName: string,
  keepSource: boolean,
): Promise<string[]> {
  if (!imagesPath || fromName.toLowerCase() === toName.toLowerCase()) return []
  assertObjectName(fromName)
  assertObjectName(toName)
  const sources = await listObjectImages(imagesPath, fromName)
  if (sources.length === 0) return []

  const targets = await listObjectImages(imagesPath, toName)
  let hasPrimary = targets.some((image) => image.isPrimary)
  let index = nextFreeIndex(targets)
  imagesRevision += 1
  const relocated: string[] = []
  for (const source of sources) {
    const ext = path.extname(source.fileName).toLowerCase()
    let destPath = path.join(imagesPath, `${toName}${ext}`)
    if (hasPrimary || (await exists(destPath))) {
      do {
        destPath = path.join(imagesPath, `${toName}(${index})${ext}`)
        index += 1
      } while (await exists(destPath))
    }
    hasPrimary = true
    const sourcePath = path.join(imagesPath, source.fileName)
    if (keepSource) await fs.copyFile(sourcePath, destPath, fs.constants.COPYFILE_EXCL)
    else await fs.rename(sourcePath, destPath)
    relocated.push(path.basename(destPath))
  }
  await carryDisplaySettings(
    imagesPath,
    sources.map((source, i) => [source.fileName, relocated[i]]),
    keepSource,
  )
  return relocated
}
