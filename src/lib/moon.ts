// Low-precision lunar/solar ephemeris (Meeus-style truncated series, no external deps).
// Accurate to roughly 0.3° in position and a few minutes for rise/set — plenty for
// "which nights are good for imaging" planning, not for precision almanac use.

import { centuriesSinceJ2000, cosD, DEG, julianDate, norm360, raDecToAltitude, sinD } from './astronomyMath'

export interface EclipticCoords {
  longitude: number // degrees
  latitude: number // degrees
}

export function sunEclipticLongitude(T: number): number {
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T)
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T)
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinD(M) +
    (0.019993 - 0.000101 * T) * sinD(2 * M) +
    0.000289 * sinD(3 * M)
  return norm360(L0 + C)
}

function moonPosition(T: number): EclipticCoords & { distanceKm: number } {
  const Lp = norm360(218.3164477 + 481267.88123421 * T)
  const D = norm360(297.8501921 + 445267.1114034 * T)
  const M = norm360(357.5291092 + 35999.0502909 * T)
  const Mp = norm360(134.9633964 + 477198.8675055 * T)
  const F = norm360(93.272095 + 483202.0175233 * T)

  const longitude = norm360(
    Lp +
      6.289 * sinD(Mp) -
      1.274 * sinD(2 * D - Mp) +
      0.658 * sinD(2 * D) -
      0.186 * sinD(M) -
      0.059 * sinD(2 * Mp - 2 * D) -
      0.057 * sinD(Mp - 2 * D + M) +
      0.053 * sinD(Mp + 2 * D) +
      0.046 * sinD(2 * D - M) +
      0.041 * sinD(Mp - M) -
      0.035 * sinD(D) -
      0.031 * sinD(Mp + M) -
      0.015 * sinD(2 * F - 2 * D) +
      0.011 * sinD(Mp - 4 * D),
  )

  const latitude =
    5.128 * sinD(F) +
    0.281 * sinD(Mp + F) -
    0.278 * sinD(F - Mp) -
    0.173 * sinD(2 * D - F) +
    0.055 * sinD(2 * D - Mp - F) +
    0.046 * sinD(2 * D - Mp + F) +
    0.033 * sinD(F + 2 * Mp) +
    0.017 * sinD(2 * D + Mp - F)

  const distanceKm =
    385001 -
    20905 * cosD(Mp) -
    3699 * cosD(2 * D - Mp) -
    2956 * cosD(2 * D) -
    570 * cosD(2 * Mp) +
    246 * cosD(2 * Mp - 2 * D) -
    205 * cosD(M - 2 * D) -
    171 * cosD(Mp + 2 * D) -
    152 * cosD(Mp + M - 2 * D)

  return { longitude, latitude, distanceKm }
}

const MOON_PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
]

export interface MoonIllumination {
  /** 0 (new) to 1 (full) */
  fraction: number
  phaseName: string
  waxing: boolean
}

export function getMoonIllumination(date: Date): MoonIllumination {
  const T = centuriesSinceJ2000(julianDate(date))
  const sunLon = sunEclipticLongitude(T)
  const moon = moonPosition(T)

  const elongation = Math.acos(cosD(moon.latitude) * cosD(moon.longitude - sunLon)) / DEG
  const fraction = (1 - cosD(elongation)) / 2

  const signedElongation = norm360(moon.longitude - sunLon)
  const bin = Math.round(signedElongation / 45) % 8
  const phaseName = MOON_PHASE_NAMES[bin]
  const waxing = signedElongation < 180

  return { fraction, phaseName, waxing }
}

export function equatorialFromEcliptic(T: number, { longitude, latitude }: EclipticCoords) {
  const obliquity = 23.4392911 - 0.0130042 * T
  const ra = norm360(
    Math.atan2(sinD(longitude) * cosD(obliquity) - Math.tan(latitude * DEG) * sinD(obliquity), cosD(longitude)) / DEG,
  )
  const dec = Math.asin(sinD(latitude) * cosD(obliquity) + cosD(latitude) * sinD(obliquity) * sinD(longitude)) / DEG
  return { ra, dec }
}

export interface MoonEquatorial {
  raDeg: number
  decDeg: number
}

/** Moon's RA/Dec (degrees, apparent-of-date) at a given time. */
export function getMoonEquatorial(date: Date): MoonEquatorial {
  const T = centuriesSinceJ2000(julianDate(date))
  const { ra, dec } = equatorialFromEcliptic(T, moonPosition(T))
  return { raDeg: ra, decDeg: dec }
}

/** Moon altitude in degrees above the horizon for an observer at (latDeg, lonDeg east-positive). */
function moonAltitude(date: Date, latDeg: number, lonDeg: number): number {
  const { raDeg, decDeg } = getMoonEquatorial(date)
  return raDecToAltitude(date, raDeg, decDeg, latDeg, lonDeg)
}

// Approximate altitude of the horizon used for moonrise/set, accounting for the
// Moon's parallax (unlike the Sun, it's too large to ignore).
const MOON_HORIZON_ALTITUDE_DEG = 0.125

export interface MoonRiseSet {
  rise: Date | null
  set: Date | null
  /** true if the Moon never sets during the sampled window */
  alwaysUp: boolean
  /** true if the Moon never rises during the sampled window */
  alwaysDown: boolean
  /** Peak Moon altitude in degrees during the sampled window */
  maxAltitudeDeg: number
  /** Time at which the peak altitude occurs */
  maxAltitudeTime: Date
}

/** Finds moonrise/moonset within [dayStart, dayStart + 24h) by sampling altitude every 5 minutes. */
export function getMoonRiseSet(dayStart: Date, latDeg: number, lonDeg: number): MoonRiseSet {
  const stepMinutes = 5
  const stepsPerDay = (24 * 60) / stepMinutes
  const samples: { time: Date; alt: number }[] = []

  for (let i = 0; i <= stepsPerDay; i++) {
    const t = new Date(dayStart.getTime() + i * stepMinutes * 60000)
    samples.push({ time: t, alt: moonAltitude(t, latDeg, lonDeg) - MOON_HORIZON_ALTITUDE_DEG })
  }

  let rise: Date | null = null
  let set: Date | null = null

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]
    const cur = samples[i]
    if (prev.alt <= 0 && cur.alt > 0 && !rise) {
      const frac = -prev.alt / (cur.alt - prev.alt)
      rise = new Date(prev.time.getTime() + frac * (cur.time.getTime() - prev.time.getTime()))
    }
    if (prev.alt > 0 && cur.alt <= 0 && !set) {
      const frac = prev.alt / (prev.alt - cur.alt)
      set = new Date(prev.time.getTime() + frac * (cur.time.getTime() - prev.time.getTime()))
    }
  }

  const alwaysUp = samples.every((s) => s.alt > 0)
  const alwaysDown = samples.every((s) => s.alt <= 0)

  const peak = samples.reduce((best, s) => (s.alt > best.alt ? s : best), samples[0])

  return {
    rise,
    set,
    alwaysUp,
    alwaysDown,
    maxAltitudeDeg: peak.alt + MOON_HORIZON_ALTITUDE_DEG,
    maxAltitudeTime: peak.time,
  }
}

export interface NightMoonInfo {
  date: Date
  illumination: MoonIllumination
  riseSet: MoonRiseSet
}

/** One entry per upcoming night, starting at local midnight of `startDate`. */
export function getUpcomingNights(startDate: Date, nights: number, latDeg: number, lonDeg: number): NightMoonInfo[] {
  const dayStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const result: NightMoonInfo[] = []
  for (let i = 0; i < nights; i++) {
    const date = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + i)
    result.push({
      date,
      illumination: getMoonIllumination(new Date(date.getTime() + 12 * 3600000)),
      riseSet: getMoonRiseSet(date, latDeg, lonDeg),
    })
  }
  return result
}

export function moonPhaseEmoji(fraction: number, waxing: boolean): string {
  if (fraction < 0.03) return '🌑'
  if (fraction < 0.47) return waxing ? '🌒' : '🌘'
  if (fraction < 0.53) return waxing ? '🌓' : '🌗'
  if (fraction < 0.97) return waxing ? '🌔' : '🌖'
  return '🌕'
}
