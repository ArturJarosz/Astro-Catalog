import { useId } from 'react'
import type { ObjectVisibility } from '../lib/objectVisibility'

interface AltitudeChartProps {
  visibility: ObjectVisibility
  windowStart: Date
}

const WIDTH = 640
const HEIGHT = 220
const PAD_LEFT = 34
const PAD_RIGHT = 30
const PAD_TOP = 10
const PAD_BOTTOM = 24
const PLOT_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT
const PLOT_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM
const WINDOW_MS = 24 * 60 * 60 * 1000

// Below-horizon altitude isn't interesting for imaging planning — crop the
// chart to a thin sliver below 0° so the visible range stays focused on
// "is it up" rather than wasting most of the chart on how far below it is.
const ALT_MIN = -5
const ALT_MAX = 90
const GRID_DEGREES = [0, 15, 30, 45, 60, 75, 90]

// Moon separation shares the plot, on a secondary right-side axis. "Up is good"
// here too — far from the Moon is plotted high, close to the Moon plotted low —
// matching the altitude axis's "up is good" convention.
const MOON_SEP_MIN = 0
const MOON_SEP_MAX = 180
const MOON_SEP_GRID_DEGREES = [0, 45, 90, 135, 180]

// Day/night background fades gradually across twilight (Sun between these
// altitudes) instead of snapping at the horizon.
const DAY_SUN_ALT = 4
const NIGHT_SUN_ALT = -4
const DAY_COLOR = [148, 163, 184, 0.16] as const // slate-400, dim
const NIGHT_COLOR = [2, 6, 23, 0.65] as const // slate-950, strong

function dayNightColor(sunAltitudeDeg: number): string {
  const t = Math.min(1, Math.max(0, (sunAltitudeDeg - NIGHT_SUN_ALT) / (DAY_SUN_ALT - NIGHT_SUN_ALT)))
  const [r, g, b, a] = NIGHT_COLOR.map((v, i) => v + (DAY_COLOR[i] - v) * t)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function xForTime(time: Date, windowStart: Date): number {
  const frac = (time.getTime() - windowStart.getTime()) / WINDOW_MS
  return PAD_LEFT + frac * PLOT_WIDTH
}

function yForAltitude(altitudeDeg: number): number {
  const frac = (altitudeDeg - ALT_MIN) / (ALT_MAX - ALT_MIN)
  return PAD_TOP + (1 - frac) * PLOT_HEIGHT
}

// Plotted inverted (180° at top, 0° at bottom) so "up" reads as "far from the
// Moon, good" on both axes, even though separation and altitude have opposite
// "closer to N is better/worse" semantics.
function yForMoonSeparation(separationDeg: number): number {
  const frac = (separationDeg - MOON_SEP_MIN) / (MOON_SEP_MAX - MOON_SEP_MIN)
  return PAD_TOP + (1 - frac) * PLOT_HEIGHT
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** Linearly interpolates altitude at `time` from the sampled track. */
function altitudeAtTime(time: Date, samples: ObjectVisibility['samples']): number {
  const t = time.getTime()
  if (t <= samples[0].time.getTime()) return samples[0].altitudeDeg
  for (let i = 1; i < samples.length; i++) {
    if (t <= samples[i].time.getTime()) {
      const prev = samples[i - 1]
      const cur = samples[i]
      const frac = (t - prev.time.getTime()) / (cur.time.getTime() - prev.time.getTime())
      return prev.altitudeDeg + frac * (cur.altitudeDeg - prev.altitudeDeg)
    }
  }
  return samples[samples.length - 1].altitudeDeg
}

export function AltitudeChart({ visibility, windowStart }: AltitudeChartProps) {
  const clipId = useId()
  const gradientId = useId()
  const { samples, rise, set, transitTime, transitAltitudeDeg } = visibility

  const linePath = samples
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${xForTime(s.time, windowStart).toFixed(1)} ${yForAltitude(s.altitudeDeg).toFixed(1)}`)
    .join(' ')

  const moonSeparationPath = samples
    .map(
      (s, i) =>
        `${i === 0 ? 'M' : 'L'} ${xForTime(s.time, windowStart).toFixed(1)} ${yForMoonSeparation(s.moonSeparationDeg).toFixed(1)}`,
    )
    .join(' ')

  const horizonY = yForAltitude(0)

  const plotBottomY = PAD_TOP + PLOT_HEIGHT
  const areaPath =
    `${linePath} ` +
    `L ${xForTime(samples[samples.length - 1].time, windowStart).toFixed(1)} ${plotBottomY} ` +
    `L ${xForTime(samples[0].time, windowStart).toFixed(1)} ${plotBottomY} Z`

  // Day/night background gradient stops, one per sample, so the fade across
  // twilight follows the Sun's actual altitude smoothly rather than snapping.
  const gradientStops = samples.map((s, i) => ({
    offset: (i / (samples.length - 1)) * 100,
    color: dayNightColor(s.sunAltitudeDeg),
  }))

  const hourTicks = Array.from({ length: 9 }, (_, i) => i * 3)

  const now = new Date()
  const showNowMarker = now.getTime() >= windowStart.getTime() && now.getTime() < windowStart.getTime() + WINDOW_MS

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Altitude over time">
      <defs>
        <clipPath id={clipId}>
          <rect x={PAD_LEFT} y={PAD_TOP} width={PLOT_WIDTH} height={PLOT_HEIGHT} />
        </clipPath>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          {gradientStops.map((stop, i) => (
            <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
          ))}
        </linearGradient>
      </defs>

      <rect x={PAD_LEFT} y={PAD_TOP} width={PLOT_WIDTH} height={PLOT_HEIGHT} fill={`url(#${gradientId})`} />

      {GRID_DEGREES.map((deg) => (
        <line
          key={deg}
          x1={PAD_LEFT}
          x2={PAD_LEFT + PLOT_WIDTH}
          y1={yForAltitude(deg)}
          y2={yForAltitude(deg)}
          className={deg === 0 ? 'stroke-slate-500' : 'stroke-white/5'}
          strokeWidth={deg === 0 ? 1.5 : 1}
        />
      ))}

      {GRID_DEGREES.map((deg) => (
        <text key={deg} x={PAD_LEFT - 6} y={yForAltitude(deg)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[9px]">
          {deg}°
        </text>
      ))}

      {MOON_SEP_GRID_DEGREES.map((deg) => (
        <text
          key={deg}
          x={PAD_LEFT + PLOT_WIDTH + 6}
          y={yForMoonSeparation(deg)}
          textAnchor="start"
          dominantBaseline="middle"
          className="fill-violet-300/70 text-[9px]"
        >
          {deg}°
        </text>
      ))}

      {hourTicks.map((h) => {
        const t = new Date(windowStart.getTime() + h * 3600000)
        const x = xForTime(t, windowStart)
        return (
          <text key={h} x={x} y={HEIGHT - 6} textAnchor="middle" className="fill-slate-500 text-[9px] tabular-nums">
            {formatTime(t)}
          </text>
        )
      })}

      <path d={areaPath} className="fill-white/10" clipPath={`url(#${clipId})`} />

      <path
        d={moonSeparationPath}
        fill="none"
        className="stroke-violet-300"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        clipPath={`url(#${clipId})`}
      />

      <path d={linePath} fill="none" className="stroke-white" strokeWidth={2} clipPath={`url(#${clipId})`} />

      {showNowMarker && (
        <circle
          cx={xForTime(now, windowStart)}
          cy={yForAltitude(Math.max(altitudeAtTime(now, samples), ALT_MIN))}
          r={4}
          className="fill-amber-400 stroke-slate-950"
          strokeWidth={1.5}
        />
      )}

      {transitAltitudeDeg > 0 && (
        <circle cx={xForTime(transitTime, windowStart)} cy={yForAltitude(transitAltitudeDeg)} r={3} className="fill-sky-300" />
      )}

      {rise && <circle cx={xForTime(rise, windowStart)} cy={horizonY} r={3} className="fill-emerald-400" />}
      {set && <circle cx={xForTime(set, windowStart)} cy={horizonY} r={3} className="fill-rose-400" />}

      <g transform={`translate(${PAD_LEFT}, ${PAD_TOP - 2})`}>
        <line x1={0} x2={12} y1={0} y2={0} className="stroke-white" strokeWidth={2} />
        <text x={16} y={0} dominantBaseline="middle" className="fill-slate-400 text-[8px]">
          Altitude
        </text>
        <line x1={62} x2={74} y1={0} y2={0} className="stroke-violet-300" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={78} y={0} dominantBaseline="middle" className="fill-violet-300/80 text-[8px]">
          Moon separation
        </text>
      </g>
    </svg>
  )
}
