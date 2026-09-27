import type { ObjectInfo, WarningInfo } from '../../electron/shared-types'
import { formatMetrics, type MetricKey } from '../lib/columns'
import { formatAngularSize, formatFramePortion } from '../lib/format'
import { rateFrameFit, textClassFor as frameFitTextClassFor } from '../lib/frameFitRating'
import { getFramePortionPercent } from '../lib/framePortion'
import type { AltitudeListMetric, MoonListMetric, NightMoonTrackSample } from '../lib/moonSeparation'
import { getObjectCoordinates } from '../lib/objectCoordinates'
import type { SeestarModel } from '../lib/seestarModel'
import { getFileTypes } from '../lib/objectStats'
import { getObjectWarnings } from '../lib/warnings'
import type { ObservingLocation } from '../lib/observingLocation'
import { MoonSeparationCells } from './MoonSeparationCells'
import { ObjectThumbnail } from './ObjectThumbnail'
import { FileTypeChips } from './FileTypeChips'

interface ObjectListTableProps {
  objects: ObjectInfo[]
  warnings: WarningInfo[]
  onSelect: (object: ObjectInfo) => void
  showThumbnails?: boolean
  imagesPath: string
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
  /** Which Moon-separation number to show — user-configurable in Configuration → Planning. */
  moonListMetric: MoonListMetric
  /** Which altitude number to show — user-configurable in Configuration → Planning. */
  altitudeListMetric: AltitudeListMetric
  /** Planning view: swaps the frame-type breakdown for Moon/altitude columns, matching ObjectCard. */
  isPlanning: boolean
  seestarModel: SeestarModel
  frameFitRatingEnabled: boolean
  frameFitGoodThresholdPercent: number
  frameFitMosaicThresholdPercent: number
  frameFitTooBigThresholdPercent: number
}

export function ObjectListTable({
  objects,
  warnings,
  onSelect,
  showThumbnails = false,
  imagesPath,
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
  moonListMetric,
  altitudeListMetric,
  isPlanning,
  seestarModel,
  frameFitRatingEnabled,
  frameFitGoodThresholdPercent,
  frameFitMosaicThresholdPercent,
  frameFitTooBigThresholdPercent,
}: ObjectListTableProps) {
  const frameTypeNames = isPlanning
    ? []
    : Array.from(new Set(objects.flatMap((o) => o.frameTypes.map((ft) => ft.name))))
        .filter((name) => visibleFrameTypes.has(name))
        .sort()

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-300">
            {showThumbnails && <th className="w-10 px-3 py-2"></th>}
            <th className="px-3 py-2 text-left font-medium">Object</th>
            {isPlanning ? (
              <>
                <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Moon</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Altitude</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Size</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Frame</th>
              </>
            ) : (
              frameTypeNames.map((name) => (
                <th key={name} className="whitespace-nowrap px-3 py-2 text-right font-medium">
                  {name}
                </th>
              ))
            )}
            {showTotal && <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Total</th>}
          </tr>
        </thead>
        <tbody>
          {objects.map((object) => {
            const objectWarnings = getObjectWarnings(object, warnings)
            const grandTotalFrames = object.frameTypes.reduce((sum, ft) => sum + ft.totalFrames, 0)
            const grandTotalExposure = object.frameTypes.reduce((sum, ft) => sum + ft.totalExposureSeconds, 0)
            const grandTotalSize = object.frameTypes.reduce((sum, ft) => sum + ft.totalSizeBytes, 0)
            const fileTypes = getFileTypes(object)
            const frameTypeByName = new Map(object.frameTypes.map((ft) => [ft.name, ft]))
            const coordinates = getObjectCoordinates(object.catalog, object.catalogNumber)
            const framePortionPercent = getFramePortionPercent(coordinates?.majorArcmin, coordinates?.minorArcmin, seestarModel)
            const frameFitRating = rateFrameFit(
              frameFitRatingEnabled,
              framePortionPercent,
              frameFitGoodThresholdPercent,
              frameFitMosaicThresholdPercent,
              frameFitTooBigThresholdPercent,
            )

            return (
              <tr
                key={object.path}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(object)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(object)
                  }
                }}
                className="cursor-pointer border-b border-white/5 bg-slate-800 transition last:border-b-0 hover:bg-slate-700"
              >
                {showThumbnails && (
                  <td className="px-3 py-2">
                    <ObjectThumbnail object={object} imagesPath={imagesPath} />
                  </td>
                )}
                <td className="px-3 py-2">
                  <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-100">
                    <span className="truncate">
                      {object.name}
                      {object.isMosaic && <span className="text-slate-300"> (Mosaic)</span>}
                    </span>
                    {objectWarnings.length > 0 && (
                      <span
                        className="flex shrink-0 items-center gap-0.5 text-xs text-amber-400"
                        title={`${objectWarnings.length} warning${objectWarnings.length === 1 ? '' : 's'}`}
                      >
                        <span>⚠</span>
                        <span className="font-medium tabular-nums">{objectWarnings.length}</span>
                      </span>
                    )}
                  </span>
                  {!isPlanning && <FileTypeChips fileTypes={fileTypes} extraOnly />}
                  </span>
                </td>
                {isPlanning ? (
                  <>
                    <MoonSeparationCells
                      object={object}
                      observingLocation={observingLocation}
                      nightMoonTrack={nightMoonTrack}
                      moonRatingEnabled={moonRatingEnabled}
                      goodThresholdDeg={moonGoodThresholdDeg}
                      perfectThresholdDeg={moonPerfectThresholdDeg}
                      altitudeRatingEnabled={altitudeRatingEnabled}
                      altitudeGoodThresholdDeg={altitudeGoodThresholdDeg}
                      altitudePerfectThresholdDeg={altitudePerfectThresholdDeg}
                      moonListMetric={moonListMetric}
                      altitudeListMetric={altitudeListMetric}
                    />
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-slate-200">
                      {formatAngularSize(coordinates?.majorArcmin, coordinates?.minorArcmin)}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right text-xs font-medium tabular-nums ${frameFitTextClassFor(frameFitRating)}`}>
                      {formatFramePortion(framePortionPercent)}
                    </td>
                  </>
                ) : (
                  frameTypeNames.map((name) => {
                    const ft = frameTypeByName.get(name)
                    return (
                      <td
                        key={name}
                        className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-slate-200"
                      >
                        {ft ? formatMetrics(ft, visibleMetrics) : <span className="text-slate-400">–</span>}
                      </td>
                    )
                  })
                )}
                {showTotal && (
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] font-bold tabular-nums text-white">
                    {formatMetrics(
                      {
                        totalFrames: grandTotalFrames,
                        totalExposureSeconds: grandTotalExposure,
                        totalSizeBytes: grandTotalSize,
                      },
                      visibleMetrics,
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
