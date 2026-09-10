import type { ObjectInfo, WarningInfo } from '../../electron/shared-types'

function isPathWithin(warningPath: string, objectPath: string): boolean {
  return warningPath === objectPath || warningPath.startsWith(`${objectPath}/`) || warningPath.startsWith(`${objectPath}\\`)
}

export function getObjectWarnings(object: ObjectInfo, warnings: WarningInfo[]): WarningInfo[] {
  return warnings.filter((w) => isPathWithin(w.path, object.path))
}
