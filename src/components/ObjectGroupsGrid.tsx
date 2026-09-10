import type { ObjectInfo, WarningInfo } from '../../electron/shared-types'
import { formatMetrics, type MetricKey } from '../lib/columns'
import { useCollapsedCatalogs } from '../lib/collapsedCatalogs'
import type { ObjectGroup } from '../lib/groupObjects'
import type { AltitudeListMetric, MoonListMetric, NightMoonTrackSample } from '../lib/moonSeparation'
import type { ObjectTypeColorKey } from '../lib/objectTypeColor'
import type { SeestarModel } from '../lib/seestarModel'
import type { ObservingLocation } from '../lib/observingLocation'
import { ObjectCard } from './ObjectCard'
import { ObjectListTable } from './ObjectListTable'
import type { ViewMode } from './ViewToggle'

interface ObjectGroupsGridProps {
  groups: ObjectGroup[]
  viewMode: ViewMode
  warnings: WarningInfo[]
  onSelectObject: (object: ObjectInfo) => void
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
  moonListMetric: MoonListMetric
  altitudeListMetric: AltitudeListMetric
  isPlanning: boolean
  seestarModel: SeestarModel
  frameFitRatingEnabled: boolean
  frameFitGoodThresholdPercent: number
  frameFitMosaicThresholdPercent: number
  frameFitTooBigThresholdPercent: number
  imagesPath: string
  objectTypeColorsEnabled: boolean
  objectTypeColors: Record<string, ObjectTypeColorKey>
  /** localStorage key under which this list remembers its collapsed catalog groups. */
  collapseStorageKey: string
}

/**
 * Renders a list of catalog groups as either the card grid or the table view, with every
 * frame-type/Moon/altitude/frame-fit prop plumbed through. Shared by the Catalogue tab and
 * both halves of the Planning tab ("Already in catalogue" and "Propositions") so the three
 * places an object list is rendered never drift apart.
 */
export function ObjectGroupsGrid({
  groups,
  viewMode,
  warnings,
  onSelectObject,
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
  imagesPath,
  objectTypeColorsEnabled,
  objectTypeColors,
  collapseStorageKey,
}: ObjectGroupsGridProps) {
  const { collapsedCatalogs, toggleCatalog } = useCollapsedCatalogs(collapseStorageKey)

  return (
    <div className="space-y-10">
      {groups.map((group) => {
        const groupTotalFrames = group.objects.reduce(
          (sum, o) => sum + o.frameTypes.reduce((s, ft) => s + ft.totalFrames, 0),
          0,
        )
        const groupTotalExposure = group.objects.reduce(
          (sum, o) => sum + o.frameTypes.reduce((s, ft) => s + ft.totalExposureSeconds, 0),
          0,
        )
        const groupTotalSize = group.objects.reduce(
          (sum, o) => sum + o.frameTypes.reduce((s, ft) => s + ft.totalSizeBytes, 0),
          0,
        )
        const isCollapsed = collapsedCatalogs.has(group.catalog)
        return (
          <section key={group.catalog}>
            <h2
              className={`flex items-baseline gap-2 text-base font-semibold uppercase tracking-wide text-slate-300 ${
                isCollapsed ? '' : 'mb-3'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleCatalog(group.catalog)}
                aria-expanded={!isCollapsed}
                title={isCollapsed ? `Expand ${group.catalog}` : `Collapse ${group.catalog}`}
                className="flex items-baseline gap-2 rounded transition hover:text-slate-200"
              >
                <span className="text-[10px] leading-none text-slate-400">{isCollapsed ? '▶' : '▼'}</span>
                {group.catalog}
                <span className="text-xs font-normal normal-case text-slate-400">({group.objects.length})</span>
              </button>
              {showTotal && (
                <span className="ml-auto text-xs font-normal normal-case tabular-nums text-slate-400">
                  {formatMetrics(
                    {
                      totalFrames: groupTotalFrames,
                      totalExposureSeconds: groupTotalExposure,
                      totalSizeBytes: groupTotalSize,
                    },
                    visibleMetrics,
                  )}
                </span>
              )}
            </h2>
            {isCollapsed ? null : viewMode === 'card' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.objects.map((object) => (
                  <ObjectCard
                    key={object.path}
                    object={object}
                    warnings={warnings}
                    onClick={() => onSelectObject(object)}
                    visibleFrameTypes={visibleFrameTypes}
                    showTotal={showTotal}
                    visibleMetrics={visibleMetrics}
                    observingLocation={observingLocation}
                    nightMoonTrack={nightMoonTrack}
                    moonRatingEnabled={moonRatingEnabled}
                    moonGoodThresholdDeg={moonGoodThresholdDeg}
                    moonPerfectThresholdDeg={moonPerfectThresholdDeg}
                    altitudeRatingEnabled={altitudeRatingEnabled}
                    altitudeGoodThresholdDeg={altitudeGoodThresholdDeg}
                    altitudePerfectThresholdDeg={altitudePerfectThresholdDeg}
                    isPlanning={isPlanning}
                    seestarModel={seestarModel}
                    frameFitRatingEnabled={frameFitRatingEnabled}
                    frameFitGoodThresholdPercent={frameFitGoodThresholdPercent}
                    frameFitMosaicThresholdPercent={frameFitMosaicThresholdPercent}
                    frameFitTooBigThresholdPercent={frameFitTooBigThresholdPercent}
                    objectTypeColorsEnabled={objectTypeColorsEnabled}
                    objectTypeColors={objectTypeColors}
                  />
                ))}
              </div>
            ) : (
              <ObjectListTable
                objects={group.objects}
                warnings={warnings}
                onSelect={onSelectObject}
                showThumbnails={viewMode === 'thumbnail-list'}
                visibleFrameTypes={visibleFrameTypes}
                showTotal={showTotal}
                visibleMetrics={visibleMetrics}
                observingLocation={observingLocation}
                nightMoonTrack={nightMoonTrack}
                moonRatingEnabled={moonRatingEnabled}
                moonGoodThresholdDeg={moonGoodThresholdDeg}
                moonPerfectThresholdDeg={moonPerfectThresholdDeg}
                altitudeRatingEnabled={altitudeRatingEnabled}
                altitudeGoodThresholdDeg={altitudeGoodThresholdDeg}
                altitudePerfectThresholdDeg={altitudePerfectThresholdDeg}
                moonListMetric={moonListMetric}
                altitudeListMetric={altitudeListMetric}
                isPlanning={isPlanning}
                seestarModel={seestarModel}
                frameFitRatingEnabled={frameFitRatingEnabled}
                frameFitGoodThresholdPercent={frameFitGoodThresholdPercent}
                frameFitMosaicThresholdPercent={frameFitMosaicThresholdPercent}
                frameFitTooBigThresholdPercent={frameFitTooBigThresholdPercent}
                imagesPath={imagesPath}
              />
            )}
          </section>
        )
      })}
    </div>
  )
}
