export function formatExposure(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s'

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

  return parts.join(' ')
}

export function formatSize(totalBytes: number): string {
  if (totalBytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = totalBytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return 'never'
  return new Date(iso).toLocaleString()
}

/** Formats right ascension (degrees, J2000) as sexagesimal hours, e.g. "05h 34m 32s". */
export function formatRa(raDeg: number): string {
  const totalHours = raDeg / 15
  const hours = Math.floor(totalHours)
  const totalMinutes = (totalHours - hours) * 60
  const minutes = Math.floor(totalMinutes)
  const seconds = Math.round((totalMinutes - minutes) * 60)
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}

/** Formats declination (degrees, J2000) as sexagesimal degrees, e.g. "+22° 00' 52\"". */
export function formatDec(decDeg: number): string {
  const sign = decDeg < 0 ? '-' : '+'
  const abs = Math.abs(decDeg)
  const degrees = Math.floor(abs)
  const totalMinutes = (abs - degrees) * 60
  const minutes = Math.floor(totalMinutes)
  const seconds = Math.round((totalMinutes - minutes) * 60)
  return `${sign}${String(degrees).padStart(2, '0')}° ${String(minutes).padStart(2, '0')}' ${String(seconds).padStart(2, '0')}"`
}

/** Formats an altitude in degrees, e.g. "34°". */
export function formatAltitude(altitudeDeg: number): string {
  return `${Math.round(altitudeDeg)}°`
}

/** Formats angular size on sky (arcmin) as major×minor, e.g. "8.7′ × 6.7′", or just major axis if minor is unknown. */
export function formatAngularSize(majorArcmin: number | undefined, minorArcmin: number | undefined): string {
  if (majorArcmin === undefined) return '—'
  if (minorArcmin === undefined) return `${majorArcmin}′`
  return `${majorArcmin}′ × ${minorArcmin}′`
}

/** Formats the portion of a Seestar's frame an object occupies, e.g. "12%", "<1%", ">999%". */
export function formatFramePortion(percent: number | null): string {
  if (percent === null) return '—'
  if (percent < 1) return '<1%'
  if (percent > 999) return '>999%'
  return `${Math.round(percent)}%`
}
