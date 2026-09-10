import type { ObjectInfo } from '../../electron/shared-types'
import { compareObjects, type SortDirection, type SortKey } from './sortObjects'

const CATALOG_ORDER = ['Messier', 'Caldwell', 'NGC', 'IC', 'Abell', 'Other']

export interface ObjectGroup {
  catalog: string
  objects: ObjectInfo[]
}

function catalogRank(catalog: string): number {
  const index = CATALOG_ORDER.indexOf(catalog)
  if (index !== -1) return index
  return CATALOG_ORDER.indexOf('Other')
}

export function groupObjectsByCatalog(objects: ObjectInfo[]): ObjectGroup[] {
  const buckets = new Map<string, ObjectInfo[]>()

  for (const object of objects) {
    const bucket = buckets.get(object.catalog)
    if (bucket) {
      bucket.push(object)
    } else {
      buckets.set(object.catalog, [object])
    }
  }

  const groups: ObjectGroup[] = Array.from(buckets.entries()).map(([catalog, catalogObjects]) => ({
    catalog,
    objects: [...catalogObjects].sort((a, b) => {
      if (a.catalogNumber !== null && b.catalogNumber !== null && a.catalogNumber !== b.catalogNumber) {
        return a.catalogNumber - b.catalogNumber
      }
      return a.name.localeCompare(b.name)
    }),
  }))

  groups.sort((a, b) => {
    const rankDiff = catalogRank(a.catalog) - catalogRank(b.catalog)
    if (rankDiff !== 0) return rankDiff
    return a.catalog.localeCompare(b.catalog)
  })

  return groups
}

export interface GroupFilterOptions {
  selectedCatalog: string | null
  nameFilter: string
  sortKey: SortKey
  sortDirection: SortDirection
}

/**
 * Groups, then narrows to a selected catalog and/or name filter, then sorts within each
 * group — the shared pipeline behind both the Catalogue tab's object list and the
 * Planning tab's "Already in catalogue" and "Propositions" lists, so all three agree on
 * what "matches the current filter" means.
 */
export function buildFilteredSortedGroups(objects: ObjectInfo[], options: GroupFilterOptions): ObjectGroup[] {
  const groups = groupObjectsByCatalog(objects)
  const visibleGroups =
    options.selectedCatalog === null ? groups : groups.filter((g) => g.catalog === options.selectedCatalog)
  const normalizedFilter = options.nameFilter.trim().toLowerCase()
  const filteredGroups =
    normalizedFilter === ''
      ? visibleGroups
      : visibleGroups
          .map((group) => ({
            ...group,
            objects: group.objects.filter((o) => o.name.toLowerCase().includes(normalizedFilter)),
          }))
          .filter((group) => group.objects.length > 0)

  return filteredGroups.map((group) => ({
    ...group,
    objects: [...group.objects].sort((a, b) => compareObjects(a, b, options.sortKey, options.sortDirection)),
  }))
}

/** Truncates a group list to at most `limit` objects total, dropping whole groups once the limit is hit. */
export function capGroupObjects(groups: ObjectGroup[], limit: number): ObjectGroup[] {
  let remaining = limit
  const result: ObjectGroup[] = []
  for (const group of groups) {
    if (remaining <= 0) break
    const objects = group.objects.slice(0, remaining)
    remaining -= objects.length
    if (objects.length > 0) result.push({ ...group, objects })
  }
  return result
}
