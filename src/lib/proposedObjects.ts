// Builds the Planning tab's "Propositions" list: catalog entries with bundled coordinate
// data that aren't already in the user's catalogue, narrowed by the optional search
// criteria configured on Configuration → Planning. Every criterion is optional — an unset
// one is simply skipped, never excludes an object.

import type { ObjectInfo } from '../../electron/shared-types'
import deepSkyCoordinates from './data/deepSkyCoordinates.json'
import { getFramePortionPercent } from './framePortion'
import { getMoonSeparationForObject, type NightMoonTrackSample } from './moonSeparation'
import { type CelestialCoordinates, formatCatalogObjectName } from './objectCoordinates'
import type { ObservingLocation } from './observingLocation'
import type { SeestarModel } from './seestarModel'

const coordinatesByKey = deepSkyCoordinates as Record<string, CelestialCoordinates>

export interface ProposalFilters {
  /** Catalogs to search. */
  catalogs: Set<string>
  minFramePortionPercent: number | null
  maxFramePortionPercent: number | null
  /** Closest the Moon is allowed to come tonight. */
  minMoonSeparationDeg: number | null
  /** Minimum average altitude while up tonight. */
  minAverageAltitudeDeg: number | null
  /** Object type codes to include (see objectType.ts) — objects with an unselected/unknown type are excluded. */
  types: Set<string>
}

/**
 * Objects from the bundled catalog data, not already in `existingKeys` (as `${catalog}:${catalogNumber}`),
 * matching every configured filter. Returns synthetic ObjectInfo entries (no captured frames) so they can
 * be rendered through the same Planning card/list/detail components as real catalogue objects.
 */
export function getProposedObjects(
  existingKeys: Set<string>,
  filters: ProposalFilters,
  seestarModel: SeestarModel,
  observingLocation: ObservingLocation | null,
  nightMoonTrack: NightMoonTrackSample[] | null,
): ObjectInfo[] {
  const needsNightData = filters.minMoonSeparationDeg !== null || filters.minAverageAltitudeDeg !== null
  const results: ObjectInfo[] = []

  for (const key of Object.keys(coordinatesByKey)) {
    if (existingKeys.has(key)) continue

    const separatorIndex = key.indexOf(':')
    const catalog = key.slice(0, separatorIndex)
    if (!filters.catalogs.has(catalog)) continue

    const coordinates = coordinatesByKey[key]

    if (!coordinates.type || !filters.types.has(coordinates.type)) continue

    if (filters.minFramePortionPercent !== null || filters.maxFramePortionPercent !== null) {
      const framePortionPercent = getFramePortionPercent(coordinates.majorArcmin, coordinates.minorArcmin, seestarModel)
      if (framePortionPercent === null) continue
      if (filters.minFramePortionPercent !== null && framePortionPercent < filters.minFramePortionPercent) continue
      if (filters.maxFramePortionPercent !== null && framePortionPercent > filters.maxFramePortionPercent) continue
    }

    if (needsNightData) {
      if (!observingLocation || !nightMoonTrack) continue
      const separation = getMoonSeparationForObject(
        nightMoonTrack,
        coordinates.raDeg,
        coordinates.decDeg,
        observingLocation.latitude,
        observingLocation.longitude,
      )
      if (!separation) continue
      if (filters.minMoonSeparationDeg !== null && separation.minSeparationDeg < filters.minMoonSeparationDeg) continue
      if (filters.minAverageAltitudeDeg !== null && separation.avgAltitudeDeg < filters.minAverageAltitudeDeg) continue
    }

    const catalogNumber = Number(key.slice(separatorIndex + 1))
    results.push({
      name: formatCatalogObjectName(catalog, catalogNumber),
      isMosaic: false,
      path: `proposed:${key}`,
      frameTypes: [],
      catalog,
      catalogNumber,
    })
  }

  return results
}
