import { useMemo } from 'react'
import type { ObjectInfo } from '../../electron/shared-types'
import { rate, textClassFor } from '../lib/moonRating'
import {
  ALTITUDE_LIST_METRIC_LABELS,
  altitudeListMetricValue,
  getMoonSeparationForObject,
  MOON_LIST_METRIC_LABELS,
  moonListMetricValue,
  type AltitudeListMetric,
  type MoonListMetric,
  type NightMoonTrackSample,
} from '../lib/moonSeparation'
import { getObjectCoordinates } from '../lib/objectCoordinates'
import type { ObservingLocation } from '../lib/observingLocation'

interface MoonSeparationCellsProps {
  object: ObjectInfo
  observingLocation: ObservingLocation | null
  nightMoonTrack: NightMoonTrackSample[] | null
  moonRatingEnabled: boolean
  goodThresholdDeg: number
  perfectThresholdDeg: number
  altitudeRatingEnabled: boolean
  altitudeGoodThresholdDeg: number
  altitudePerfectThresholdDeg: number
  /** Which Moon-separation number to show — user-configurable in Configuration → Planning. */
  moonListMetric: MoonListMetric
  /** Which altitude number to show — user-configurable in Configuration → Planning. */
  altitudeListMetric: AltitudeListMetric
}

/**
 * Table-row equivalent of MoonSeparationDetail — same Moon/altitude numbers
 * and Bad/Good/Perfect tinting, condensed into two <td> cells for the list
 * and thumbnail views so their Planning data matches the card view. Unlike
 * the card (which always shows every number), space here is tight, so the
 * displayed — and rated — number is whichever the user picked in
 * Configuration → Planning.
 */
export function MoonSeparationCells({
  object,
  observingLocation,
  nightMoonTrack,
  moonRatingEnabled,
  goodThresholdDeg,
  perfectThresholdDeg,
  altitudeRatingEnabled,
  altitudeGoodThresholdDeg,
  altitudePerfectThresholdDeg,
  moonListMetric,
  altitudeListMetric,
}: MoonSeparationCellsProps) {
  const result = useMemo(() => {
    if (!observingLocation || !nightMoonTrack) return null
    const coordinates = getObjectCoordinates(object.catalog, object.catalogNumber)
    if (!coordinates) return null
    return getMoonSeparationForObject(
      nightMoonTrack,
      coordinates.raDeg,
      coordinates.decDeg,
      observingLocation.latitude,
      observingLocation.longitude,
    )
  }, [object.catalog, object.catalogNumber, observingLocation, nightMoonTrack])

  if (!result) {
    return (
      <>
        <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-slate-400">–</td>
        <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-slate-400">–</td>
      </>
    )
  }

  const moonValueDeg = moonListMetricValue(result, moonListMetric)
  const altitudeValueDeg = altitudeListMetricValue(result, altitudeListMetric)
  const moonRating = rate(moonRatingEnabled, moonValueDeg, goodThresholdDeg, perfectThresholdDeg)
  const altitudeRating = rate(altitudeRatingEnabled, altitudeValueDeg, altitudeGoodThresholdDeg, altitudePerfectThresholdDeg)

  return (
    <>
      <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums">
        <div className={`font-medium ${textClassFor(moonRating)}`}>{Math.round(moonValueDeg)}°</div>
        <div className="text-slate-400">{MOON_LIST_METRIC_LABELS[moonListMetric]}</div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums">
        <div className={`font-medium ${textClassFor(altitudeRating)}`}>{Math.round(altitudeValueDeg)}°</div>
        <div className="text-slate-400">{ALTITUDE_LIST_METRIC_LABELS[altitudeListMetric]}</div>
      </td>
    </>
  )
}
