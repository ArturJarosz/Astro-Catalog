// Computes an altitude-over-time track for a fixed-position deep-sky object (RA/Dec),
// plus rise/transit/set times and Sun altitude (for night shading). Mirrors the
// sampling/crossing-detection approach used for the Moon in moon.ts, generalized
// via raDecToAltitude since the object's RA/Dec doesn't move during a night.

import { angularSeparationDeg, centuriesSinceJ2000, julianDate, raDecToAltitude } from './astronomyMath'
import { equatorialFromEcliptic, getMoonEquatorial, sunEclipticLongitude } from './moon'

export interface ObjectAltitudeSample {
  time: Date
  altitudeDeg: number
  sunAltitudeDeg: number
  moonSeparationDeg: number
}

export interface ObjectVisibility {
  samples: ObjectAltitudeSample[]
  rise: Date | null
  set: Date | null
  /** true if the object never sets during the sampled window */
  alwaysUp: boolean
  /** true if the object never rises during the sampled window */
  alwaysDown: boolean
  transitTime: Date
  transitAltitudeDeg: number
}

function sunAltitude(date: Date, latDeg: number, lonDeg: number): number {
  const T = centuriesSinceJ2000(julianDate(date))
  const { ra, dec } = equatorialFromEcliptic(T, { longitude: sunEclipticLongitude(T), latitude: 0 })
  return raDecToAltitude(date, ra, dec, latDeg, lonDeg)
}

/** Samples object + Sun altitude every 10 minutes across [dayStart, dayStart + 24h). */
export function getObjectVisibility(
  dayStart: Date,
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
): ObjectVisibility {
  const stepMinutes = 10
  const stepsPerDay = (24 * 60) / stepMinutes
  const samples: ObjectAltitudeSample[] = []

  for (let i = 0; i <= stepsPerDay; i++) {
    const time = new Date(dayStart.getTime() + i * stepMinutes * 60000)
    const moon = getMoonEquatorial(time)
    samples.push({
      time,
      altitudeDeg: raDecToAltitude(time, raDeg, decDeg, latDeg, lonDeg),
      sunAltitudeDeg: sunAltitude(time, latDeg, lonDeg),
      moonSeparationDeg: angularSeparationDeg(raDeg, decDeg, moon.raDeg, moon.decDeg),
    })
  }

  let rise: Date | null = null
  let set: Date | null = null

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]
    const cur = samples[i]
    if (prev.altitudeDeg <= 0 && cur.altitudeDeg > 0 && !rise) {
      const frac = -prev.altitudeDeg / (cur.altitudeDeg - prev.altitudeDeg)
      rise = new Date(prev.time.getTime() + frac * (cur.time.getTime() - prev.time.getTime()))
    }
    if (prev.altitudeDeg > 0 && cur.altitudeDeg <= 0 && !set) {
      const frac = prev.altitudeDeg / (prev.altitudeDeg - cur.altitudeDeg)
      set = new Date(prev.time.getTime() + frac * (cur.time.getTime() - prev.time.getTime()))
    }
  }

  const alwaysUp = samples.every((s) => s.altitudeDeg > 0)
  const alwaysDown = samples.every((s) => s.altitudeDeg <= 0)

  const transit = samples.reduce((best, s) => (s.altitudeDeg > best.altitudeDeg ? s : best), samples[0])

  return {
    samples,
    rise,
    set,
    alwaysUp,
    alwaysDown,
    transitTime: transit.time,
    transitAltitudeDeg: transit.altitudeDeg,
  }
}
