/** How many files of one format (lower-case extension, no dot) a folder holds, and their size. */
export interface FileTypeInfo {
  extension: string
  count: number
  sizeBytes: number
}

export interface SessionInfo {
  date: string
  captureSeconds: number
  /** Only frame files (see FRAME_EXTENSIONS) — previews and other formats are excluded. */
  frameCount: number
  folderPath: string
  /** Every file in the folder, whatever its format. */
  sizeBytes: number
  fileTypes: FileTypeInfo[]
}

export interface FrameTypeInfo {
  name: string
  sessions: SessionInfo[]
  totalFrames: number
  totalExposureSeconds: number
  totalSizeBytes: number
  fileTypes: FileTypeInfo[]
}

export interface ObjectInfo {
  name: string
  isMosaic: boolean
  path: string
  frameTypes: FrameTypeInfo[]
  catalog: string
  catalogNumber: number | null
}

export interface WarningInfo {
  path: string
  message: string
}

export interface CatalogueData {
  rootPath: string | null
  lastScannedAt: string | null
  objects: ObjectInfo[]
  warnings: WarningInfo[]
}

export interface ScanProgress {
  currentPath: string
  objectsScanned: number
}

export interface ObjectSummary {
  title: string
  description: string | null
  extract: string | null
  thumbnailUrl: string | null
  pageUrl: string | null
}

export const DEFAULT_SEESTAR_DIRECTORY_PATTERN = '{object}/{type}/{date} {type} {exposure}'

export const DEFAULT_SEESTAR_SOURCE_DIR_WINDOWS = String.raw`\\seestar\EMMC Images\MyWorks`
export const DEFAULT_SEESTAR_SOURCE_DIR_LINUX = '/mnt/seestar/EMMC Images/MyWorks'
export const DEFAULT_SEESTAR_SOURCE_DIR = DEFAULT_SEESTAR_SOURCE_DIR_WINDOWS

export const DEFAULT_SEESTAR_EXTENSIONS = ['fit']

export interface SeestarSourceDirectory {
  name: string
  /** True for a "<Object>_sub" (light frames) or "<Target>_video" (Sun/Moon/planet clips) folder. */
  isImportable: boolean
  totalFiles: number
  /** Lower-case extension (without the dot) → number of files in the directory. */
  extensionCounts: Record<string, number>
}

export interface SeestarSubDirGroupSummary {
  targetDate: string
  type: string
  targetExposure: string
  extension: string
  count: number
}

export interface SeestarSubDirSummary {
  name: string
  groups: SeestarSubDirGroupSummary[]
}

export interface SeestarInvalidFile {
  subDirectory: string
  fileName: string
}

export interface SeestarCopyItem {
  sourcePath: string
  destinationPath: string
  destinationDirectory: string
  fileName: string
  objectName: string
  extension: string
  type: string
  targetDate: string
  targetExposure: string
  alreadyExists: boolean
  sizeBytes: number
}

export interface SeestarCopyPlan {
  subDirSummaries: SeestarSubDirSummary[]
  invalidFiles: SeestarInvalidFile[]
  copyItems: SeestarCopyItem[]
}

export interface SeestarCopyProgress {
  copiedFiles: number
  totalFiles: number
  /** Bytes copied so far across every file, including partial progress on the current one — drives the progress bar so one large video file still shows smooth movement. */
  copiedBytes: number
  totalBytes: number
  fileName: string
}

export interface SeestarCopyResult {
  copiedCount: number
  /** Top-level folder names under the import target that received files. */
  importedTopLevelDirectories: string[]
}

/** One file to relocate when merging a duplicate target's folder into the chosen main folder. */
export interface MergeMoveItem {
  sourcePath: string
  destinationPath: string
  destinationDirectory: string
  /** Original file name. */
  fileName: string
  /** File name after swapping the source target name for the main one (unchanged if it wasn't embedded). */
  newFileName: string
  /** Top-level folder name the file currently lives under. */
  sourceObject: string
  type: string
  date: string
  exposure: string
  /** A file already sits at destinationPath — it will be skipped, not overwritten. */
  alreadyExists: boolean
  sizeBytes: number
}

export interface MergePlan {
  mainObjectName: string
  items: MergeMoveItem[]
  collisionCount: number
  /** Root-level folder names touched by the merge — the units to re-analyse afterwards. */
  affectedTopLevelNames: string[]
}

export interface MergeProgress {
  movedFiles: number
  totalFiles: number
  movedBytes: number
  totalBytes: number
  fileName: string
}

export interface MergeResult {
  movedCount: number
  skipped: { sourcePath: string; reason: string }[]
}

/** A merge plan for renaming one object, plus whether the new name already has a folder. */
export interface RenamePlan extends MergePlan {
  /** True when `<root>/<newFolderName>` already exists — the rename then behaves as a merge. */
  targetExists: boolean
  /** Destination top-level folder, e.g. "M 99" or "M 99_mosaic". */
  newFolderName: string
  /** The object folder being renamed, e.g. "M 31" or "M 31_mosaic". */
  oldFolderName: string
}

const INVALID_OBJECT_NAME_CHARS = /[/\\:*?"<>|]/

/**
 * Validates a user-typed object (folder) name for rename. Returns an error message, or
 * `null` when the name is usable. Pure — safe to import from the renderer.
 */
export function validateObjectName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'Enter a name.'
  if (trimmed === '.' || trimmed === '..') return 'Choose a different name.'
  if (INVALID_OBJECT_NAME_CHARS.test(trimmed)) return 'Name cannot contain / \\ : * ? " < > |'
  return null
}

export type CurrentLocationResult =
  | { ok: true; latitude: number; longitude: number; label: string | null }
  | { ok: false; error: string }

export interface AstroCatalogueApi {
  selectRootDir: () => Promise<string | null>
  analyzeDirectory: (root: string, directoryPattern: string) => Promise<CatalogueData>
  analyzeDirectories: (
    root: string,
    directoryPattern: string,
    topLevelNames: string[],
  ) => Promise<CatalogueData>
  getCatalogue: () => Promise<CatalogueData>
  onScanProgress: (callback: (progress: ScanProgress) => void) => () => void
  getObjectSummary: (name: string, catalog: string, catalogNumber: number | null) => Promise<ObjectSummary | null>
  openExternal: (url: string) => Promise<void>
  checkSeestarConnection: (sourceDirectory: string) => Promise<boolean>
  listSeestarDirectories: (sourceDirectory: string) => Promise<SeestarSourceDirectory[]>
  selectSeestarTargetDir: () => Promise<string | null>
  selectObjectImagesDir: () => Promise<string | null>
  getLocalObjectImage: (imagesPath: string, objectName: string) => Promise<string | null>
  buildSeestarCopyPlan: (
    subDirNames: string[],
    targetDirectory: string,
    directoryPattern: string,
    sourceDirectory: string,
    extensions: string[],
  ) => Promise<SeestarCopyPlan>
  executeSeestarCopy: (
    items: SeestarCopyItem[],
    overwrite: boolean,
    targetDirectory: string,
  ) => Promise<SeestarCopyResult>
  onSeestarCopyProgress: (callback: (progress: SeestarCopyProgress) => void) => () => void
  buildMergePlan: (
    rootPath: string,
    mainObjectPath: string,
    otherObjectPaths: string[],
    directoryPattern: string,
  ) => Promise<MergePlan>
  executeMerge: (items: MergeMoveItem[], sourceObjectPaths: string[]) => Promise<MergeResult>
  onMergeProgress: (callback: (progress: MergeProgress) => void) => () => void
  buildRenamePlan: (
    rootPath: string,
    objectPath: string,
    isMosaic: boolean,
    newName: string,
    directoryPattern: string,
  ) => Promise<RenamePlan>
  executeRename: (items: MergeMoveItem[], sourceObjectPaths: string[]) => Promise<MergeResult>
  onRenameProgress: (callback: (progress: MergeProgress) => void) => () => void
  getCurrentLocation: () => Promise<CurrentLocationResult>
}
