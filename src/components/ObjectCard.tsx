import type { ObjectInfo, WarningInfo } from '../../electron/shared-types'
import { formatMetrics, type MetricKey } from '../lib/columns'
import { formatAngularSize, formatFramePortion } from '../lib/format'
import { labelFor, rateFrameFit, textClassFor as frameFitTextClassFor } from '../lib/frameFitRating'
import { getFramePortionPercent } from '../lib/framePortion'
import type { NightMoonTrackSample } from '../lib/moonSeparation'
import { getObjectCoordinates } from '../lib/objectCoordinates'
import { labelForObjectType } from '../lib/objectType'
import { objectTypeBadgeClasses, type ObjectTypeColorKey } from '../lib/objectTypeColor'
import type { SeestarModel } from '../lib/seestarModel'
import { getObjectWarnings } from '../lib/warnings'
import type { ObservingLocation } from '../lib/observingLocation'
import { MoonSeparationDetail } from './MoonSeparationDetail'
import { FileTypeChips } from './FileTypeChips'

interface ObjectCardProps {
  object: ObjectInfo
  warnings: WarningInfo[]
  onClick: () => void
  visibleFrameTypes: Set<string>
  showTotal: boolean
  visibleMetrics: Set<MetricKey>
  observingLocation: ObservingLocation | null
  nightMoonTrack: NightMoonTrackSample[] | null
  moonRatingEnabled: boolean
  moonGoodThresholdDeg: number
  moonPerfectThresholdDeg: number
  altitudeRatingEnabled: boolean
  altitudeGoodThresholdDeg: number
  altitudePerfectThresholdDeg: number
  /** Planning view: swaps the frame-type breakdown for a Moon-distance readout. */
  isPlanning: boolean
  seestarModel: SeestarModel
  frameFitRatingEnabled: boolean
  frameFitGoodThresholdPercent: number
  frameFitMosaicThresholdPercent: number
  frameFitTooBigThresholdPercent: number
  objectTypeColorsEnabled: boolean
  objectTypeColors: Record<string, ObjectTypeColorKey>
}

export function ObjectCard({
  object,
  warnings,
  onClick,
  visibleFrameTypes,
  showTotal,
  visibleMetrics,
  observingLocation,
  nightMoonTrack,
  moonRatingEnabled,
  moonGoodThresholdDeg,
  moonPerfectThresholdDeg,
  altitudeRatingEnabled,
  altitudeGoodThresholdDeg,
  altitudePerfectThresholdDeg,
  isPlanning,
  seestarModel,
  frameFitRatingEnabled,
  frameFitGoodThresholdPercent,
  frameFitMosaicThresholdPercent,
  frameFitTooBigThresholdPercent,
  objectTypeColorsEnabled,
  objectTypeColors,
}: ObjectCardProps) {
  const grandTotalFrames = object.frameTypes.reduce((sum, ft) => sum + ft.totalFrames, 0)
  const grandTotalExposure = object.frameTypes.reduce((sum, ft) => sum + ft.totalExposureSeconds, 0)
  const grandTotalSize = object.frameTypes.reduce((sum, ft) => sum + ft.totalSizeBytes, 0)
  const objectWarnings = getObjectWarnings(object, warnings)
  const visibleFrameTypeList = object.frameTypes.filter((ft) => visibleFrameTypes.has(ft.name))
  const coordinates = getObjectCoordinates(object.catalog, object.catalogNumber)
  const objectTypeLabel = labelForObjectType(coordinates?.type)
  const framePortionPercent = getFramePortionPercent(coordinates?.majorArcmin, coordinates?.minorArcmin, seestarModel)
  const frameFitRating = rateFrameFit(
    frameFitRatingEnabled,
    framePortionPercent,
    frameFitGoodThresholdPercent,
    frameFitMosaicThresholdPercent,
    frameFitTooBigThresholdPercent,
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="cursor-pointer rounded-lg border border-white/20 bg-slate-800 p-3 shadow-md transition hover:border-white/30 hover:bg-slate-700"
    >
      <h3 className="mb-2 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-100">
        <span className="truncate">
          {object.name}
          {object.isMosaic && <span className="text-slate-300"> (Mosaic)</span>}
        </span>
        {objectTypeLabel && (
          <span
            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${objectTypeBadgeClasses(
              coordinates?.type,
              objectTypeColorsEnabled,
              objectTypeColors,
            )}`}
          >
            {objectTypeLabel}
          </span>
        )}
        {objectWarnings.length > 0 && (
          <span
            className="flex shrink-0 items-center gap-0.5 text-amber-400"
            title={`${objectWarnings.length} warning${objectWarnings.length === 1 ? '' : 's'}`}
          >
            <span>⚠</span>
            <span className="text-xs font-medium tabular-nums">{objectWarnings.length}</span>
          </span>
        )}
      </h3>

      {isPlanning ? (
        <>
          {coordinates?.majorArcmin !== undefined && (
            <p className="mb-1.5 text-xs tabular-nums text-slate-300">
              <span className="text-slate-400">Size </span>
              {formatAngularSize(coordinates.majorArcmin, coordinates.minorArcmin)}
              <span className="text-slate-400"> · Frame </span>
              <span className={`font-medium ${frameFitTextClassFor(frameFitRating)}`}>
                {formatFramePortion(framePortionPercent)}
              </span>
              {frameFitRating && <span className="text-slate-400"> ({labelFor(frameFitRating)})</span>}
            </p>
          )}
          <MoonSeparationDetail
            object={object}
            observingLocation={observingLocation}
            nightMoonTrack={nightMoonTrack}
            moonRatingEnabled={moonRatingEnabled}
            goodThresholdDeg={moonGoodThresholdDeg}
            perfectThresholdDeg={moonPerfectThresholdDeg}
            altitudeRatingEnabled={altitudeRatingEnabled}
            altitudeGoodThresholdDeg={altitudeGoodThresholdDeg}
            altitudePerfectThresholdDeg={altitudePerfectThresholdDeg}
          />
        </>
      ) : visibleFrameTypeList.length === 0 ? (
        <p className="text-xs text-slate-400">No frame-type folders found</p>
      ) : (
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-md bg-black/20 px-2 py-1.5 text-xs tabular-nums">
          {visibleFrameTypeList.map((ft) => (
            <div className="contents" key={ft.name}>
              <span className="flex flex-wrap items-center gap-1.5 font-medium text-slate-200">
                {ft.name}
                <FileTypeChips fileTypes={ft.fileTypes} extraOnly />
              </span>
              <span className="text-right text-slate-200">{formatMetrics(ft, visibleMetrics)}</span>
            </div>
          ))}
          {showTotal && (
            <div className="contents">
              <span className="mt-1 border-t border-white/10 pt-1 font-semibold uppercase tracking-wide text-slate-300">
                Total
              </span>
              <span className="mt-1 border-t border-white/10 pt-1 text-right font-bold text-white">
                {formatMetrics(
                  {
                    totalFrames: grandTotalFrames,
                    totalExposureSeconds: grandTotalExposure,
                    totalSizeBytes: grandTotalSize,
                  },
                  visibleMetrics,
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
