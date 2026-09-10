import type { ObjectInfo } from '../../electron/shared-types'
import { getObjectCoordinates } from './objectCoordinates'

export interface DuplicateTargetGroup {
  /** Two or more catalogued folders that resolve to the same physical target. */
  objects: ObjectInfo[]
  /** Human label listing every alias, e.g. "M 31 / NGC 224". */
  aliasLabel: string
  /** Stable id for this exact set of folders — changes when the membership changes. */
  signature: string
}

/**
 * A key that is equal for catalogue aliases of the same object: the bundled J2000 RA/Dec,
 * rounded to arcsecond-ish precision. `null` when the object has no bundled coordinates
 * (custom "Other" names) — those can only be grouped through a manual link.
 */
export function coordinateKey(object: ObjectInfo): string | null {
  const coordinates = getObjectCoordinates(object.catalog, object.catalogNumber)
  if (!coordinates) return null
  return `${coordinates.raDeg.toFixed(3)}:${coordinates.decDeg.toFixed(3)}`
}

class UnionFind {
  private parent: number[]

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i)
  }

  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]
      x = this.parent[x]
    }
    return x
  }

  union(a: number, b: number): void {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA !== rootB) this.parent[rootB] = rootA
  }
}

/**
 * Groups catalogue objects that point at the same physical target — either because their
 * bundled coordinates match (and they are both/neither mosaics), or because the user has
 * manually linked their folders. Only groups with at least two distinct folders are returned.
 *
 * Shared by the Catalogue banner and the merge modal so both agree on what counts as a
 * duplicate (CLAUDE.md rule 1).
 */
export function findDuplicateTargetGroups(
  objects: ObjectInfo[],
  manualLinks: string[][] = [],
): DuplicateTargetGroup[] {
  const uf = new UnionFind(objects.length)

  const firstIndexByKey = new Map<string, number>()
  objects.forEach((object, index) => {
    const key = coordinateKey(object)
    if (key === null) return
    const bucket = `${key}|${object.isMosaic ? 'mosaic' : 'single'}`
    const seen = firstIndexByKey.get(bucket)
    if (seen === undefined) firstIndexByKey.set(bucket, index)
    else uf.union(seen, index)
  })

  const indexByPath = new Map(objects.map((object, index) => [object.path, index]))
  for (const link of manualLinks) {
    const indices = link
      .map((objectPath) => indexByPath.get(objectPath))
      .filter((value): value is number => value !== undefined)
    for (let i = 1; i < indices.length; i += 1) uf.union(indices[0], indices[i])
  }

  const membersByRoot = new Map<number, ObjectInfo[]>()
  objects.forEach((object, index) => {
    const root = uf.find(index)
    const members = membersByRoot.get(root) ?? []
    members.push(object)
    membersByRoot.set(root, members)
  })

  const groups: DuplicateTargetGroup[] = []
  for (const members of membersByRoot.values()) {
    const distinctPaths = [...new Set(members.map((object) => object.path))]
    if (distinctPaths.length < 2) continue
    const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name))
    groups.push({
      objects: sorted,
      aliasLabel: sorted.map((object) => object.name).join(' / '),
      signature: [...distinctPaths].sort().join('|'),
    })
  }

  return groups.sort((a, b) => a.aliasLabel.localeCompare(b.aliasLabel))
}

/** Total captured frames across every frame type of an object. */
function totalFrames(object: ObjectInfo): number {
  return object.frameTypes.reduce((sum, frameType) => sum + frameType.totalFrames, 0)
}

/** Total captured exposure (seconds) across every frame type of an object. */
function totalExposureSeconds(object: ObjectInfo): number {
  return object.frameTypes.reduce((sum, frameType) => sum + frameType.totalExposureSeconds, 0)
}

/** The folder that should be the merge target by default: the one with the most captured data. */
export function defaultMainObject(objects: ObjectInfo[]): ObjectInfo {
  return [...objects].sort((a, b) => {
    const frameDiff = totalFrames(b) - totalFrames(a)
    if (frameDiff !== 0) return frameDiff
    const exposureDiff = totalExposureSeconds(b) - totalExposureSeconds(a)
    if (exposureDiff !== 0) return exposureDiff
    return a.name.localeCompare(b.name)
  })[0]
}
