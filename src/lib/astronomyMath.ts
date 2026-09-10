// Shared low-precision astronomy helpers (sidereal time, alt/az) used by both
// the lunar ephemeris (moon.ts) and generic RA/Dec visibility calculations
// (objectVisibility.ts). No external deps, accurate to a few arcminutes/minutes
// — plenty for "when is this object up" planning.

export const DEG = Math.PI / 180

export function sinD(deg: number): number {
  return Math.sin(deg * DEG)
}
export function cosD(deg: number): number {
  return Math.cos(deg * DEG)
}
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

export function centuriesSinceJ2000(jd: number): number {
  return (jd - 2451545.0) / 36525
}

export function greenwichSiderealTime(jd: number): number {
  const T = centuriesSinceJ2000(jd)
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T)
}

/** Altitude in degrees above the horizon for an observer at (latDeg, lonDeg east-positive), for a fixed RA/Dec (degrees, J2000). */
export function raDecToAltitude(date: Date, raDeg: number, decDeg: number, latDeg: number, lonDeg: number): number {
  const gst = greenwichSiderealTime(julianDate(date))
  const lst = norm360(gst + lonDeg)
  const hourAngle = norm360(lst - raDeg)
  const h = hourAngle > 180 ? hourAngle - 360 : hourAngle
  return Math.asin(sinD(latDeg) * sinD(decDeg) + cosD(latDeg) * cosD(decDeg) * cosD(h)) / DEG
}

/** Great-circle angular separation in degrees between two RA/Dec positions (degrees). */
export function angularSeparationDeg(ra1Deg: number, dec1Deg: number, ra2Deg: number, dec2Deg: number): number {
  const cosSep = sinD(dec1Deg) * sinD(dec2Deg) + cosD(dec1Deg) * cosD(dec2Deg) * cosD(ra1Deg - ra2Deg)
  return Math.acos(Math.min(1, Math.max(-1, cosSep))) / DEG
}
