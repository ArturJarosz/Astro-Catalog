import { mergeFileTypes } from '../../electron/file-types'
import type { FileTypeInfo, ObjectInfo } from '../../electron/shared-types'

export interface FrameTypeTotals {
  name: string
  totalFrames: number
  totalExposureSeconds: number
  totalSizeBytes: number
}

export interface CatalogueTotals {
  objectCount: number
  totalFrames: number
  totalExposureSeconds: number
  totalSizeBytes: number
  /** Per frame type (IRCUT, LP, …), busiest first. */
  frameTypes: FrameTypeTotals[]
  /** Per file format (fit, jpg, …), frame formats first. */
  fileTypes: FileTypeInfo[]
}

/**
 * Rolls a set of objects up into catalogue-wide totals plus a per-frame-type breakdown.
 * Kept here rather than in the summary component so any view that needs the same numbers
 * (or a per-group variant) reads them from one place.
 */
export function summarizeObjects(objects: ObjectInfo[]): CatalogueTotals {
  const byFrameType = new Map<string, FrameTypeTotals>()
  const fileTypeGroups: FileTypeInfo[][] = []
  let totalFrames = 0
  let totalExposureSeconds = 0
  let totalSizeBytes = 0

  for (const object of objects) {
    for (const frameType of object.frameTypes) {
      totalFrames += frameType.totalFrames
      totalExposureSeconds += frameType.totalExposureSeconds
      totalSizeBytes += frameType.totalSizeBytes
      fileTypeGroups.push(frameType.fileTypes)

      const existing = byFrameType.get(frameType.name)
      if (existing) {
        existing.totalFrames += frameType.totalFrames
        existing.totalExposureSeconds += frameType.totalExposureSeconds
        existing.totalSizeBytes += frameType.totalSizeBytes
      } else {
        byFrameType.set(frameType.name, {
          name: frameType.name,
          totalFrames: frameType.totalFrames,
          totalExposureSeconds: frameType.totalExposureSeconds,
          totalSizeBytes: frameType.totalSizeBytes,
        })
      }
    }
  }

  const frameTypes = [...byFrameType.values()].sort((a, b) => {
    if (b.totalExposureSeconds !== a.totalExposureSeconds) return b.totalExposureSeconds - a.totalExposureSeconds
    return a.name.localeCompare(b.name)
  })

  return {
    objectCount: objects.length,
    totalFrames,
    totalExposureSeconds,
    totalSizeBytes,
    frameTypes,
    fileTypes: mergeFileTypes(fileTypeGroups),
  }
}
