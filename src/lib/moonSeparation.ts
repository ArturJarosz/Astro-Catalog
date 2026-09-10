// Cheap "how close does the Moon get to this target tonight" check for list views.
// Computes the Moon's position once per night/location (computeNightMoonTrack), then
// each object only needs its own altitude + a separation lookup against that shared
// track — avoids recomputing the Moon's position per object when rendering a list.

import { angularSeparationDeg, centuriesSinceJ2000, julianDate, raDecToAltitude } from './astronomyMath'
import { equatorialFromEcliptic, getMoonEquatorial, sunEclipticLongitude } from './moon'

export interface NightMoonTrackSample {
  time: Date
  moonRaDeg: number
  moonDecDeg: number
  sunAltitudeDeg: number
}

/**
 * Anchors the "tonight" window at local noon, so [anchor, anchor + 24h)
 * always contains exactly one full night (sunset -> sunrise) — never the
 * tail of last night AND the start of tonight, which a plain calendar day
 * (midnight -> midnight) would. Before noon, "tonight" is the night that
 * started yesterday evening and is still in progress; from noon on, it's
 * the upcoming one.
 */
export function getTonightWindowStart(now: Date): Date {
  const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  return now.getTime() < noon.getTime() ? new Date(noon.getTime() - 24 * 3600000) : noon
}

function sunAltitude(date: Date, latDeg: number, lonDeg: number): number {
  const T = centuriesSinceJ2000(julianDate(date))
  const { ra, dec } = equatorialFromEcliptic(T, { longitude: sunEclipticLongitude(T), latitude: 0 })
  return raDecToAltitude(date, ra, dec, latDeg, lonDeg)
}

/** Samples Moon position + Sun altitude every 15 min across [dayStart, dayStart + 24h). */
export function computeNightMoonTrack(dayStart: Date, latDeg: number, lonDeg: number): NightMoonTrackSample[] {
  const stepMinutes = 15
  const stepsPerDay = (24 * 60) / stepMinutes
  const track: NightMoonTrackSample[] = []

  for (let i = 0; i <= stepsPerDay; i++) {
    const time = new Date(dayStart.getTime() + i * stepMinutes * 60000)
    const { raDeg, decDeg } = getMoonEquatorial(time)
    track.push({ time, moonRaDeg: raDeg, moonDecDeg: decDeg, sunAltitudeDeg: sunAltitude(time, latDeg, lonDeg) })
  }

  return track
}

export interface MoonSeparationResult {
  /** Separation right now (independent of the night track/filter). */
  currentSeparationDeg: number
  /** Smallest separation tonight — nearest approach, worst case for image quality. */
  minSeparationDeg: number
  minSeparationTime: Date
  /** Largest separation tonight — farthest point, best case. Shown as "Farthest" in the UI. */
  maxSeparationDeg: number
  maxSeparationTime: Date
  /** Mean separation across the same up-at-night samples used for min/maxSeparationDeg. */
  avgSeparationDeg: number
  /** Peak altitude (deg) across the same up-at-night samples. */
  maxAltitudeDeg: number
  /** Mean altitude (deg) across the same up-at-night samples. */
  avgAltitudeDeg: number
}

/** Which Moon-separation number the list/thumbnail views show for a target. */
export type MoonListMetric = 'closest' | 'average' | 'current' | 'farthest'

/** Which altitude number the list/thumbnail views show for a target. */
export type AltitudeListMetric = 'average' | 'max'

export const MOON_LIST_METRIC_LABELS: Record<MoonListMetric, string> = {
  closest: 'Closest',
  average: 'Average',
  current: 'Now',
  farthest: 'Farthest',
}

export const ALTITUDE_LIST_METRIC_LABELS: Record<AltitudeListMetric, string> = {
  average: 'Average',
  max: 'Max',
}

/** Picks the Moon-separation number a given MoonListMetric refers to. */
export function moonListMetricValue(result: MoonSeparationResult, metric: MoonListMetric): number {
  switch (metric) {
    case 'closest':
      return result.minSeparationDeg
    case 'average':
      return result.avgSeparationDeg
    case 'current':
      return result.currentSeparationDeg
    case 'farthest':
      return result.maxSeparationDeg
  }
}

/** Picks the altitude number a given AltitudeListMetric refers to. */
export function altitudeListMetricValue(result: MoonSeparationResult, metric: AltitudeListMetric): number {
  return metric === 'average' ? result.avgAltitudeDeg : result.maxAltitudeDeg
}

/**
 * Current, closest, farthest, and average Moon separation, plus peak +
 * average altitude, while the object is above the horizon during night
 * (sunAltitudeDeg < 0). Single source of truth for these numbers — the
 * Planning card, the object detail popup, and the list badge all call this
 * so they never disagree. Returns null if the object is never up at night
 * in this track.
 */
export function getMoonSeparationForObject(
  track: NightMoonTrackSample[],
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
): MoonSeparationResult | null {
  let minSeparationDeg = Infinity
  let minSeparationTime: Date | null = null
  let maxSeparationDeg = -Infinity
  let maxSeparationTime: Date | null = null
  let separationSum = 0
  let maxAltitudeDeg = -Infinity
  let altitudeSum = 0
  let count = 0

  for (const sample of track) {
    if (sample.sunAltitudeDeg >= 0) continue
    const altitudeDeg = raDecToAltitude(sample.time, raDeg, decDeg, latDeg, lonDeg)
    if (altitudeDeg <= 0) continue

    const separationDeg = angularSeparationDeg(raDeg, decDeg, sample.moonRaDeg, sample.moonDecDeg)
    separationSum += separationDeg
    altitudeSum += altitudeDeg
    count += 1
    if (altitudeDeg > maxAltitudeDeg) maxAltitudeDeg = altitudeDeg
    if (separationDeg < minSeparationDeg) {
      minSeparationDeg = separationDeg
      minSeparationTime = sample.time
    }
    if (separationDeg > maxSeparationDeg) {
      maxSeparationDeg = separationDeg
      maxSeparationTime = sample.time
    }
  }

  if (!minSeparationTime || !maxSeparationTime) return null

  const currentMoon = getMoonEquatorial(new Date())
  const currentSeparationDeg = angularSeparationDeg(raDeg, decDeg, currentMoon.raDeg, currentMoon.decDeg)

  return {
    currentSeparationDeg,
    minSeparationDeg,
    minSeparationTime,
    maxSeparationDeg,
    maxSeparationTime,
    avgSeparationDeg: separationSum / count,
    maxAltitudeDeg,
    avgAltitudeDeg: altitudeSum / count,
  }
}
