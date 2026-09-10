import { useEffect, useMemo } from 'react'
import type { ObjectInfo, WarningInfo } from '../../electron/shared-types'
import { AltitudeChart } from './AltitudeChart'
import type { ObservingLocation } from '../lib/observingLocation'
import { formatAltitude, formatAngularSize, formatExposure, formatFramePortion, formatRa, formatSize } from '../lib/format'
import { raDecToAltitude } from '../lib/astronomyMath'
import { labelFor, rateFrameFit, textClassFor as frameFitTextClassFor } from '../lib/frameFitRating'
import { getFramePortionPercent } from '../lib/framePortion'
import { getMoonSeparationForObject, type NightMoonTrackSample } from '../lib/moonSeparation'
import { getObjectCoordinates } from '../lib/objectCoordinates'
import { getObjectVisibility } from '../lib/objectVisibility'
import { labelForObjectType } from '../lib/objectType'
import { objectTypeBadgeClasses, type ObjectTypeColorKey } from '../lib/objectTypeColor'
import type { SeestarModel } from '../lib/seestarModel'
import { useObjectImage } from '../lib/useObjectImage'
import { getObjectWarnings } from '../lib/warnings'
import { FileTypeChips } from './FileTypeChips'

interface ObjectDetailModalProps {
  object: ObjectInfo
  warnings: WarningInfo[]
  observingLocation: ObservingLocation | null
  nightMoonTrack: NightMoonTrackSample[] | null
  seestarModel: SeestarModel
  frameFitRatingEnabled: boolean
  frameFitGoodThresholdPercent: number
  frameFitMosaicThresholdPercent: number
  frameFitTooBigThresholdPercent: number
  imagesPath: string
  objectTypeColorsEnabled: boolean
  objectTypeColors: Record<string, ObjectTypeColorKey>
  onRename?: () => void
  onClose: () => void
}

function formatTime(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function ObjectDetailModal({
  object,
  warnings,
  observingLocation,
  nightMoonTrack,
  seestarModel,
  frameFitRatingEnabled,
  frameFitGoodThresholdPercent,
  frameFitMosaicThresholdPercent,
  frameFitTooBigThresholdPercent,
  imagesPath,
  objectTypeColorsEnabled,
  objectTypeColors,
  onRename,
  onClose,
}: ObjectDetailModalProps) {
  const { imageUrl, summary, loading: loadingSummary } = useObjectImage(object, imagesPath, true)
  const objectWarnings = getObjectWarnings(object, warnings)

  const coordinates = useMemo(() => getObjectCoordinates(object.catalog, object.catalogNumber), [object.catalog, object.catalogNumber])
  const objectTypeLabel = labelForObjectType(coordinates?.type)
  const framePortionPercent = useMemo(
    () => getFramePortionPercent(coordinates?.majorArcmin, coordinates?.minorArcmin, seestarModel),
    [coordinates, seestarModel],
  )
  const frameFitRating = rateFrameFit(
    frameFitRatingEnabled,
    framePortionPercent,
    frameFitGoodThresholdPercent,
    frameFitMosaicThresholdPercent,
    frameFitTooBigThresholdPercent,
  )

  // Window starts 1h before now (not local midnight) so the chart looks mostly
  // forward at what's plannable tonight, with just a sliver of recent past for context.
  const visibilityWindowStart = useMemo(() => new Date(Date.now() - 3600000), [])

  const visibility = useMemo(() => {
    if (!observingLocation || !coordinates) return null
    return getObjectVisibility(
      visibilityWindowStart,
      coordinates.raDeg,
      coordinates.decDeg,
      observingLocation.latitude,
      observingLocation.longitude,
    )
  }, [observingLocation, coordinates, visibilityWindowStart])

  const currentAltitudeDeg = useMemo(() => {
    if (!observingLocation || !coordinates) return null
    return raDecToAltitude(new Date(), coordinates.raDeg, coordinates.decDeg, observingLocation.latitude, observingLocation.longitude)
  }, [observingLocation, coordinates])

  // Same night window + filter as the Planning card (MoonSeparationDetail/Badge use
  // the identical function against the identical shared track), so the two surfaces
  // never disagree about "tonight's" closest/average Moon separation.
  const nightSeparation = useMemo(() => {
    if (!observingLocation || !nightMoonTrack || !coordinates) return null
    return getMoonSeparationForObject(
      nightMoonTrack,
      coordinates.raDeg,
      coordinates.decDeg,
      observingLocation.latitude,
      observingLocation.longitude,
    )
  }, [observingLocation, nightMoonTrack, coordinates])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">{object.name}</h2>
            {objectWarnings.length > 0 && (
              <span
                className="text-amber-400"
                title={`${objectWarnings.length} warning${objectWarnings.length === 1 ? '' : 's'}`}
              >
                ⚠
              </span>
            )}
            {object.isMosaic && (
              <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-300">
                Mosaic
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300">
              {object.catalog}
            </span>
            {objectTypeLabel && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${objectTypeBadgeClasses(
                  coordinates?.type,
                  objectTypeColorsEnabled,
                  objectTypeColors,
                )}`}
              >
                {objectTypeLabel}
              </span>
            )}
            {coordinates?.majorArcmin !== undefined && (
              <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-sky-300">
                Size {formatAngularSize(coordinates.majorArcmin, coordinates.minorArcmin)} · Frame{' '}
                <span className={frameFitRating ? frameFitTextClassFor(frameFitRating) : undefined}>
                  {formatFramePortion(framePortionPercent)}
                  {frameFitRating && ` (${labelFor(frameFitRating)})`}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRename && (
              <button
                onClick={onRename}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10"
              >
                Rename
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-slate-200"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 sm:flex-row">
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-96">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30">
              {loadingSummary ? (
                <span className="text-xs text-slate-400">Loading…</span>
              ) : imageUrl ? (
                <img src={imageUrl} alt={object.name} className="h-full w-full object-cover" />
              ) : (
                <span className="px-3 text-center text-xs text-slate-400">No image available</span>
              )}
            </div>

            {!loadingSummary && summary?.description && (
              <p className="text-sm font-medium text-slate-200">{summary.description}</p>
            )}
            {!loadingSummary && summary?.extract && (
              <p className="text-xs leading-relaxed text-slate-400">{summary.extract}</p>
            )}
            {!loadingSummary && summary?.pageUrl && (
              <button
                onClick={() => window.astroCatalogue.openExternal(summary.pageUrl!)}
                className="text-left text-xs font-medium text-sky-400 hover:text-sky-300"
              >
                View on Wikipedia →
              </button>
            )}
            {!loadingSummary && !summary && <p className="text-xs text-slate-400">No classification data found.</p>}
          </div>

          <div className="min-w-0 flex-1 space-y-5">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Visibility Today</h3>
              {!observingLocation ? (
                <p className="text-xs text-slate-400">
                  Set your observing location in the Configuration tab to see when this object is up.
                </p>
              ) : !coordinates ? (
                <p className="text-xs text-slate-400">No coordinate data available for this object.</p>
              ) : (
                visibility && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-md bg-black/20 px-3 py-2 text-xs tabular-nums text-slate-200">
                      <span>
                        <span className="text-slate-400">RA </span>
                        {formatRa(coordinates.raDeg)}
                      </span>
                      <span>
                        <span className="text-slate-400">Alt </span>
                        {currentAltitudeDeg !== null ? formatAltitude(currentAltitudeDeg) : '—'}
                      </span>
                      <span>
                        <span className="text-slate-400">Rises </span>
                        {visibility.alwaysUp ? 'always up' : visibility.alwaysDown ? 'never' : formatTime(visibility.rise)}
                      </span>
                      <span>
                        <span className="text-slate-400">Peak </span>
                        {Math.round(visibility.transitAltitudeDeg)}° at {formatTime(visibility.transitTime)}
                      </span>
                      <span>
                        <span className="text-slate-400">Sets </span>
                        {visibility.alwaysUp ? 'never' : visibility.alwaysDown ? 'always down' : formatTime(visibility.set)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-md bg-black/20 px-3 py-2 text-xs tabular-nums text-slate-200">
                      <span>
                        <span className="text-slate-400">Size </span>
                        {formatAngularSize(coordinates.majorArcmin, coordinates.minorArcmin)}
                      </span>
                      <span>
                        <span className="text-slate-400">Frame </span>
                        <span className={frameFitRating ? `font-medium ${frameFitTextClassFor(frameFitRating)}` : undefined}>
                          {formatFramePortion(framePortionPercent)}
                          {frameFitRating && ` (${labelFor(frameFitRating)})`}
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-md bg-black/20 px-3 py-2 text-xs tabular-nums text-slate-200">
                      <span>
                        <span className="text-slate-400">Moon now </span>
                        {nightSeparation ? `${Math.round(nightSeparation.currentSeparationDeg)}°` : '—'}
                      </span>
                      <span>
                        <span className="text-slate-400">Closest </span>
                        {nightSeparation
                          ? `${Math.round(nightSeparation.minSeparationDeg)}° at ${formatTime(nightSeparation.minSeparationTime)}`
                          : '—'}
                      </span>
                      <span>
                        <span className="text-slate-400">Farthest </span>
                        {nightSeparation
                          ? `${Math.round(nightSeparation.maxSeparationDeg)}° at ${formatTime(nightSeparation.maxSeparationTime)}`
                          : '—'}
                      </span>
                      <span>
                        <span className="text-slate-400">Average </span>
                        {nightSeparation ? `${Math.round(nightSeparation.avgSeparationDeg)}°` : '—'}
                      </span>
                    </div>
                    <div className="rounded-md bg-black/20 p-3">
                      <AltitudeChart visibility={visibility} windowStart={visibilityWindowStart} />
                      <p className="mt-1 text-[10px] text-slate-400">
                        Shaded regions are night (Sun below horizon).{' '}
                        {!nightSeparation && 'Not above the horizon tonight. '}
                        Approximate, computed locally — no network required.
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            {object.frameTypes.length === 0 ? (
              <p className="text-sm text-slate-400">No frame-type folders found</p>
            ) : (
              object.frameTypes.map((ft) => (
                <div key={ft.name}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold text-slate-200">{ft.name}</h3>
                    <span className="flex items-baseline gap-2 text-xs tabular-nums text-slate-400">
                      <FileTypeChips fileTypes={ft.fileTypes} />
                      <span>
                        {ft.totalFrames} frames &middot; {formatExposure(ft.totalExposureSeconds)} &middot;{' '}
                        {formatSize(ft.totalSizeBytes)}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 rounded-md bg-black/20 px-3 py-2 text-xs tabular-nums">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Date</span>
                    <span className="text-right text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Frames
                    </span>
                    <span className="text-right text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Exposure
                    </span>
                    <span className="text-right text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      Size
                    </span>
                    {ft.sessions.map((session) => (
                      <div className="contents" key={session.folderPath}>
                        <span className="flex flex-col gap-0.5 text-slate-200">
                          {session.date}
                          <FileTypeChips fileTypes={session.fileTypes} />
                        </span>
                        <span className="text-right text-slate-200">{session.frameCount}</span>
                        <span className="text-right text-slate-200">
                          {formatExposure(session.frameCount * session.captureSeconds)}
                        </span>
                        <span className="text-right text-slate-200">{formatSize(session.sizeBytes)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {objectWarnings.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-300">
                  <span>⚠</span>
                  Warnings ({objectWarnings.length})
                </h3>
                <ul className="space-y-1.5 rounded-md border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs">
                  {objectWarnings.map((w, i) => (
                    <li key={i} className="font-mono">
                      <span className="text-amber-400">{w.path}</span>
                      <span className="text-amber-200/90"> — {w.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
