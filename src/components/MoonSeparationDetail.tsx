import { useMemo } from 'react'
import type { ObjectInfo } from '../../electron/shared-types'
import { formatTime, panelClassFor, rate, textClassFor } from '../lib/moonRating'
import { getMoonSeparationForObject, type NightMoonTrackSample } from '../lib/moonSeparation'
import { getObjectCoordinates } from '../lib/objectCoordinates'
import type { ObservingLocation } from '../lib/observingLocation'

interface MoonSeparationDetailProps {
  object: ObjectInfo
  observingLocation: ObservingLocation | null
  nightMoonTrack: NightMoonTrackSample[] | null
  /** Whether the Moon panel is tinted Bad/Good/Perfect at all. */
  moonRatingEnabled: boolean
  /** Below this separation (deg), the Moon panel rates "Bad" (tinted rose). */
  goodThresholdDeg: number
  /** At/above this separation (deg), the Moon panel rates "Perfect" (tinted emerald). */
  perfectThresholdDeg: number
  /** Whether the height panel is tinted Bad/Good/Perfect at all. */
  altitudeRatingEnabled: boolean
  /** Below this average altitude (deg), the height panel rates "Bad" (tinted rose). */
  altitudeGoodThresholdDeg: number
  /** At/above this average altitude (deg), the height panel rates "Perfect" (tinted emerald). */
  altitudePerfectThresholdDeg: number
}

/**
 * Moon-distance readout for the Planning view, where it replaces the
 * frame-type breakdown as the card's main content — the point of that tab is
 * deciding whether the Moon rules a target out, not how many subs you
 * already have. Tinted using the same Bad/Good/Perfect thresholds as the
 * list/thumbnail views' MoonSeparationCells, so the Configuration → Planning
 * settings visibly affect every view the same way.
 */
export function MoonSeparationDetail({
  object,
  observingLocation,
  nightMoonTrack,
  moonRatingEnabled,
  goodThresholdDeg,
  perfectThresholdDeg,
  altitudeRatingEnabled,
  altitudeGoodThresholdDeg,
  altitudePerfectThresholdDeg,
}: MoonSeparationDetailProps) {
  const coordinates = useMemo(
    () => getObjectCoordinates(object.catalog, object.catalogNumber),
    [object.catalog, object.catalogNumber],
  )

  const result = useMemo(() => {
    if (!observingLocation || !nightMoonTrack || !coordinates) return null
    return getMoonSeparationForObject(
      nightMoonTrack,
      coordinates.raDeg,
      coordinates.decDeg,
      observingLocation.latitude,
      observingLocation.longitude,
    )
  }, [observingLocation, nightMoonTrack, coordinates])

  if (!observingLocation) {
    return <p className="text-xs text-slate-400">Set an observing location in Configuration → General.</p>
  }
  if (!coordinates) {
    return <p className="text-xs text-slate-400">No coordinate data available for this object.</p>
  }
  if (!result) {
    return <p className="text-xs text-slate-400">Not above the horizon tonight.</p>
  }

  // Moon rating: closer is worse, so it's driven by the closest (minimum) approach.
  const moonRating = rate(moonRatingEnabled, result.minSeparationDeg, goodThresholdDeg, perfectThresholdDeg)
  // Altitude rating: higher is better, so it's driven by the average altitude while up tonight.
  const altitudeRating = rate(altitudeRatingEnabled, result.avgAltitudeDeg, altitudeGoodThresholdDeg, altitudePerfectThresholdDeg)

  return (
    <div className="space-y-1.5">
      <div className={`rounded-md px-2 py-1.5 text-xs ${panelClassFor(moonRating)}`}>
        <div className="flex items-center gap-1.5 text-slate-200">
          <span>🌙</span>
          <span className="tabular-nums">
            Now <span className="font-semibold text-slate-100">{Math.round(result.currentSeparationDeg)}°</span>
          </span>
        </div>
        <div className="mt-0.5 space-y-0.5 tabular-nums text-slate-400">
          <div>
            Closest{' '}
            <span className={`font-medium ${textClassFor(moonRating)}`}>{Math.round(result.minSeparationDeg)}°</span> at{' '}
            {formatTime(result.minSeparationTime)}
          </div>
          <div>
            Farthest <span className="font-medium text-slate-200">{Math.round(result.maxSeparationDeg)}°</span> at{' '}
            {formatTime(result.maxSeparationTime)}
          </div>
          <div>Average {Math.round(result.avgSeparationDeg)}° while up tonight</div>
        </div>
      </div>
      <div className={`rounded-md px-2 py-1.5 text-xs ${panelClassFor(altitudeRating)}`}>
        <div className="flex items-center gap-1.5 text-slate-200">
          <span>⬆</span>
          <span className="tabular-nums">
            Max height <span className="font-semibold text-slate-100">{Math.round(result.maxAltitudeDeg)}°</span>
          </span>
        </div>
        <div className="mt-0.5 tabular-nums text-slate-400">
          Averages <span className={`font-medium ${textClassFor(altitudeRating)}`}>{Math.round(result.avgAltitudeDeg)}°</span> while up
          tonight
        </div>
      </div>
    </div>
  )
}
