import { mergeFileTypes } from '../../electron/file-types'
import type { FileTypeInfo, ObjectInfo } from '../../electron/shared-types'

export function getTotalFrames(object: ObjectInfo): number {
  return object.frameTypes.reduce((sum, ft) => sum + ft.totalFrames, 0)
}

export function getTotalExposureSeconds(object: ObjectInfo): number {
  return object.frameTypes.reduce((sum, ft) => sum + ft.totalExposureSeconds, 0)
}

export function getTotalSizeBytes(object: ObjectInfo): number {
  return object.frameTypes.reduce((sum, ft) => sum + ft.totalSizeBytes, 0)
}

export function getFileTypes(object: ObjectInfo): FileTypeInfo[] {
  return mergeFileTypes(object.frameTypes.map((ft) => ft.fileTypes))
}

export function getLastSessionDate(object: ObjectInfo): string | null {
  let latest: string | null = null
  for (const ft of object.frameTypes) {
    for (const session of ft.sessions) {
      if (latest === null || session.date > latest) latest = session.date
    }
  }
  return latest
}
