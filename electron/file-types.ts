import type { FileTypeInfo } from './shared-types'

/**
 * Formats that count as light frames: only these drive frame counts and integration
 * time. Every other format found in a session folder (jpg previews, tiff exports,
 * avi clips, …) is still catalogued and sized, just never counted as a frame.
 */
export const FRAME_EXTENSIONS = ['fit', 'fits']

const FRAME_EXTENSION_SET = new Set(FRAME_EXTENSIONS)

export function isFrameExtension(extension: string): boolean {
  return FRAME_EXTENSION_SET.has(extension.toLowerCase())
}

/** Frame formats first, then the largest consumers of disk, then alphabetically. */
function compareFileTypes(a: FileTypeInfo, b: FileTypeInfo): number {
  const aIsFrame = isFrameExtension(a.extension)
  const bIsFrame = isFrameExtension(b.extension)
  if (aIsFrame !== bIsFrame) return aIsFrame ? -1 : 1
  if (b.sizeBytes !== a.sizeBytes) return b.sizeBytes - a.sizeBytes
  return a.extension.localeCompare(b.extension)
}

/**
 * Rolls several per-folder file-type breakdowns up into one. Used at every level of the
 * catalogue (session → frame type → object → whole catalogue) so the numbers always agree.
 */
export function mergeFileTypes(groups: Iterable<readonly FileTypeInfo[]>): FileTypeInfo[] {
  const merged = new Map<string, FileTypeInfo>()
  for (const group of groups) {
    for (const fileType of group) {
      const existing = merged.get(fileType.extension)
      if (existing) {
        existing.count += fileType.count
        existing.sizeBytes += fileType.sizeBytes
      } else {
        merged.set(fileType.extension, { ...fileType })
      }
    }
  }
  return [...merged.values()].sort(compareFileTypes)
}

/**
 * The formats that are *not* light frames. Compact views show only these, so a
 * FITS-only catalogue looks unchanged while anything extra becomes visible.
 */
export function nonFrameFileTypes(fileTypes: readonly FileTypeInfo[]): FileTypeInfo[] {
  return fileTypes.filter((fileType) => !isFrameExtension(fileType.extension))
}
