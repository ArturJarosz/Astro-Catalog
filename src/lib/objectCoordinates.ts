import deepSkyCoordinates from './data/deepSkyCoordinates.json'

export interface CelestialCoordinates {
  raDeg: number
  decDeg: number
  majorArcmin?: number
  minorArcmin?: number
  /** Raw OpenNGC type code (e.g. "G", "PN") — see src/lib/objectType.ts for the display label. */
  type?: string
}

const coordinatesByKey = deepSkyCoordinates as Record<string, CelestialCoordinates>

/** Looks up J2000 RA/Dec for a catalogued object. Returns null if no data is bundled for it. */
export function getObjectCoordinates(catalog: string, catalogNumber: number | null): CelestialCoordinates | null {
  if (catalogNumber === null) return null
  return coordinatesByKey[`${catalog}:${catalogNumber}`] ?? null
}

/** Catalogs the bundled coordinate data has entries for — the searchable universe for Planning proposals. */
export const DEEP_SKY_CATALOGS = ['Messier', 'Caldwell', 'NGC', 'IC'] as const

const CATALOG_NAME_PREFIXES: Record<string, string> = {
  Messier: 'M',
  Caldwell: 'C',
  NGC: 'NGC',
  IC: 'IC',
}

/** Short display name for a catalog entry that isn't in the user's own catalogue yet, e.g. "M 42". */
export function formatCatalogObjectName(catalog: string, catalogNumber: number): string {
  const prefix = CATALOG_NAME_PREFIXES[catalog] ?? catalog
  return `${prefix} ${catalogNumber}`
}

/**
 * A key that is equal for catalogue aliases of the same object (e.g. M 31 and NGC 224): the
 * bundled J2000 RA/Dec rounded to arcsecond-ish precision. Shared by duplicate detection and
 * alternative-name lookup so both agree on what counts as the same target (CLAUDE.md rule 1).
 */
export function coordinatesKey(coordinates: CelestialCoordinates): string {
  return `${coordinates.raDeg.toFixed(3)}:${coordinates.decDeg.toFixed(3)}`
}

let catalogKeysByCoordinatesKey: Map<string, string[]> | null = null

function aliasIndex(): Map<string, string[]> {
  if (catalogKeysByCoordinatesKey) return catalogKeysByCoordinatesKey
  const index = new Map<string, string[]>()
  for (const [key, coordinates] of Object.entries(coordinatesByKey)) {
    const bucketKey = coordinatesKey(coordinates)
    const bucket = index.get(bucketKey)
    if (bucket) bucket.push(key)
    else index.set(bucketKey, [key])
  }
  catalogKeysByCoordinatesKey = index
  return index
}

/**
 * Other catalogue designations of the same bundled object, e.g. "M 31" -> ["NGC 224"].
 * Ordered Messier, Caldwell, NGC, IC. Empty when the object has no bundled data.
 */
export function getAlternativeNames(catalog: string, catalogNumber: number | null): string[] {
  const coordinates = getObjectCoordinates(catalog, catalogNumber)
  if (!coordinates) return []
  const ownKey = `${catalog}:${catalogNumber}`
  return (aliasIndex().get(coordinatesKey(coordinates)) ?? [])
    .filter((key) => key !== ownKey)
    .map((key) => {
      const separatorIndex = key.indexOf(':')
      return { catalog: key.slice(0, separatorIndex), catalogNumber: Number(key.slice(separatorIndex + 1)) }
    })
    .sort(
      (a, b) =>
        DEEP_SKY_CATALOGS.indexOf(a.catalog as (typeof DEEP_SKY_CATALOGS)[number]) -
          DEEP_SKY_CATALOGS.indexOf(b.catalog as (typeof DEEP_SKY_CATALOGS)[number]) ||
        a.catalogNumber - b.catalogNumber,
    )
    .map((alias) => formatCatalogObjectName(alias.catalog, alias.catalogNumber))
}
