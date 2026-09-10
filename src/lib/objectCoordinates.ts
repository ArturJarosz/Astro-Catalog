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
