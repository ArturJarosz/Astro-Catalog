import { useMemo } from 'react'
import { getUpcomingNights, moonPhaseEmoji } from '../lib/moon'
import type { ObservingLocation } from '../lib/observingLocation'

interface MoonPanelProps {
  location: ObservingLocation | null
  nights: number
  highlightTonight: boolean
}

function formatTime(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function darknessLabel(fraction: number): { label: string; className: string } {
  if (fraction <= 0.25) return { label: 'Great for narrowband & broadband', className: 'text-emerald-400' }
  if (fraction <= 0.6) return { label: 'OK for narrowband, tough for broadband', className: 'text-amber-400' }
  return { label: 'Narrowband only — bright sky', className: 'text-rose-400' }
}

export function MoonPanel({ location, nights: nightsShown, highlightTonight }: MoonPanelProps) {
  const nights = useMemo(() => {
    if (!location) return []
    return getUpcomingNights(new Date(), nightsShown, location.latitude, location.longitude)
  }, [location, nightsShown])

  return (
    <section className="rounded-xl border border-white/10 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Next Good Nights</h2>

      {!location ? (
        <p className="text-xs text-slate-400">
          Set your observing location in the Configuration tab to see moon illumination and rise/set times for the
          next {nightsShown} nights.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="py-1 pr-4 font-medium">Night</th>
                <th className="py-1 pr-4 font-medium">Phase</th>
                <th className="py-1 pr-4 font-medium">Illum.</th>
                <th className="py-1 pr-4 font-medium">Moonrise</th>
                <th className="py-1 pr-4 font-medium">Moonset</th>
                <th className="py-1 pr-4 font-medium">Max Alt.</th>
                <th className="py-1 font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {nights.map((night, i) => {
                const verdict = darknessLabel(night.illumination.fraction)
                const isTonight = highlightTonight && i === 0
                return (
                  <tr
                    key={night.date.toDateString()}
                    className={`border-t border-white/5 ${isTonight ? 'text-base font-semibold text-slate-100' : ''}`}
                  >
                    <td className="py-1.5 pr-4 tabular-nums">
                      {night.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {isTonight && <span className="ml-2 text-[10px] font-medium uppercase text-sky-400">Tonight</span>}
                    </td>
                    <td className="py-1.5 pr-4">
                      <span className="mr-1">{moonPhaseEmoji(night.illumination.fraction, night.illumination.waxing)}</span>
                      {night.illumination.phaseName}
                    </td>
                    <td className="py-1.5 pr-4 tabular-nums">{Math.round(night.illumination.fraction * 100)}%</td>
                    <td className="py-1.5 pr-4 tabular-nums">
                      {night.riseSet.alwaysDown ? 'never' : formatTime(night.riseSet.rise)}
                    </td>
                    <td className="py-1.5 pr-4 tabular-nums">
                      {night.riseSet.alwaysUp ? 'never' : formatTime(night.riseSet.set)}
                    </td>
                    <td className="py-1.5 pr-4 tabular-nums">
                      {night.riseSet.alwaysDown
                        ? '—'
                        : `${Math.round(night.riseSet.maxAltitudeDeg)}° (${formatTime(night.riseSet.maxAltitudeTime)})`}
                    </td>
                    <td className={`py-1.5 font-medium ${verdict.className}`}>{verdict.label}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-slate-400">
            Approximate (within a few minutes) — computed locally from a low-precision lunar ephemeris, no network
            required.
          </p>
        </div>
      )}
    </section>
  )
}
