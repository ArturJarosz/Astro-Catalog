import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  DEFAULT_SEESTAR_SOURCE_DIR,
  type CatalogueData,
  type ObjectInfo,
} from '../electron/shared-types'
import { AppNav, type AppSection } from './components/AppNav'
import { CatalogueSummary } from './components/CatalogueSummary'
import { ColumnFilter } from './components/ColumnFilter'
import { ConfigurationView } from './components/ConfigurationView'
import { DuplicateTargetsBanner } from './components/DuplicateTargetsBanner'
import { MergeTargetsModal } from './components/MergeTargetsModal'
import { Header } from './components/Header'
import { MoonPanel } from './components/MoonPanel'
import { ObjectDetailModal } from './components/ObjectDetailModal'
import { RenameObjectModal } from './components/RenameObjectModal'
import { ObjectGroupsGrid } from './components/ObjectGroupsGrid'
import { PropositionFilters } from './components/PropositionFilters'
import { SeestarModelSelect } from './components/SeestarModelSelect'
import { SeestarView } from './components/SeestarView'
import { Sidebar } from './components/Sidebar'
import { SortControl } from './components/SortControl'
import { ViewToggle, type ViewMode } from './components/ViewToggle'
import { buildFilteredSortedGroups, capGroupObjects, groupObjectsByCatalog } from './lib/groupObjects'
import { type MetricKey } from './lib/columns'
import {
  computeNightMoonTrack,
  getTonightWindowStart,
  type AltitudeListMetric,
  type MoonListMetric,
} from './lib/moonSeparation'
import { summarizeObjects } from './lib/catalogueSummary'
import { findDuplicateTargetGroups } from './lib/duplicateTargets'
import { DEEP_SKY_CATALOGS } from './lib/objectCoordinates'
import { OBSERVING_LOCATION_STORAGE_KEY, type ObservingLocation } from './lib/observingLocation'
import { FILTERABLE_OBJECT_TYPES } from './lib/objectType'
import type { ObjectTypeColorKey } from './lib/objectTypeColor'
import { getProposedObjects } from './lib/proposedObjects'
import { DEFAULT_SEESTAR_MODEL, type SeestarModel } from './lib/seestarModel'
import type { SortDirection, SortKey } from './lib/sortObjects'

export type ConnectionStatus = 'checking' | 'connected' | 'disconnected'

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('catalogue')
  const [catalogue, setCatalogue] = useState<CatalogueData | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanProgressLabel, setScanProgressLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null)
  const [selectedObject, setSelectedObject] = useState<ObjectInfo | null>(null)
  const [renamingObject, setRenamingObject] = useState<ObjectInfo | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem('viewMode') as ViewMode | null) ?? 'card',
  )
  const [nameFilter, setNameFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedFrameTypes, setSelectedFrameTypes] = useState<Set<string> | null>(null)
  const [showTotal, setShowTotal] = useState(true)
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricKey>>(
    () => new Set<MetricKey>(['frames', 'exposure', 'size']),
  )
  const [directoryPattern, setDirectoryPattern] = useState<string>(
    () => localStorage.getItem('seestarDirectoryPattern') ?? DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  )

  function handleDirectoryPatternChange(pattern: string) {
    setDirectoryPattern(pattern)
    localStorage.setItem('seestarDirectoryPattern', pattern)
  }

  // Folders the user has manually declared to be the same physical target (each entry is a
  // list of object paths), for targets the coordinate match can't catch (custom "Other" names).
  const [manualTargetLinks, setManualTargetLinks] = useState<string[][]>(() => {
    try {
      const stored = localStorage.getItem('manualTargetLinks')
      return stored ? (JSON.parse(stored) as string[][]) : []
    } catch {
      return []
    }
  })

  function persistManualTargetLinks(links: string[][]) {
    setManualTargetLinks(links)
    localStorage.setItem('manualTargetLinks', JSON.stringify(links))
  }

  function handleAddManualLink(paths: string[]) {
    if (paths.length < 2) return
    persistManualTargetLinks([...manualTargetLinks, paths])
  }

  function handleRemoveManualLink(index: number) {
    persistManualTargetLinks(manualTargetLinks.filter((_, i) => i !== index))
  }

  const [mergeModalOpen, setMergeModalOpen] = useState(false)
  const [dismissedDuplicatesKey, setDismissedDuplicatesKey] = useState<string | null>(
    () => localStorage.getItem('dismissedDuplicatesKey'),
  )

  const [observingLocation, setObservingLocation] = useState<ObservingLocation | null>(() => {
    const stored = localStorage.getItem(OBSERVING_LOCATION_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as ObservingLocation) : null
  })

  function handleObservingLocationChange(location: ObservingLocation) {
    setObservingLocation(location)
    localStorage.setItem(OBSERVING_LOCATION_STORAGE_KEY, JSON.stringify(location))
  }

  // Recomputed once per "night" (nightKey flips at local noon, not midnight — see
  // getTonightWindowStart), shared by every object card/row and the detail popup so
  // the Moon's position isn't recalculated per-object and both surfaces agree.
  const nightKey = getTonightWindowStart(new Date()).toDateString()
  const nightMoonTrack = useMemo(() => {
    if (!observingLocation) return null
    const dayStart = getTonightWindowStart(new Date())
    return computeNightMoonTrack(dayStart, observingLocation.latitude, observingLocation.longitude)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observingLocation, nightKey])

  const [moonPanelNights, setMoonPanelNights] = useState<number>(
    () => Number(localStorage.getItem('moonPanelNights')) || 3,
  )

  function handleMoonPanelNightsChange(nights: number) {
    setMoonPanelNights(nights)
    localStorage.setItem('moonPanelNights', String(nights))
  }

  const [highlightTonight, setHighlightTonight] = useState<boolean>(
    () => (localStorage.getItem('moonPanelHighlightTonight') ?? 'true') === 'true',
  )

  function handleHighlightTonightChange(highlight: boolean) {
    setHighlightTonight(highlight)
    localStorage.setItem('moonPanelHighlightTonight', String(highlight))
  }

  const [moonRatingEnabled, setMoonRatingEnabled] = useState<boolean>(
    () => (localStorage.getItem('moonRatingEnabled') ?? 'true') === 'true',
  )

  function handleMoonRatingEnabledChange(enabled: boolean) {
    setMoonRatingEnabled(enabled)
    localStorage.setItem('moonRatingEnabled', String(enabled))
  }

  // Moon-distance rating tiers: Bad (< good), Good (>= good, < perfect), Perfect (>= perfect).
  const [moonGoodThresholdDeg, setMoonGoodThresholdDeg] = useState<number>(
    () => Number(localStorage.getItem('moonGoodThresholdDeg')) || 15,
  )

  function handleMoonGoodThresholdDegChange(deg: number) {
    setMoonGoodThresholdDeg(deg)
    localStorage.setItem('moonGoodThresholdDeg', String(deg))
  }

  const [moonPerfectThresholdDeg, setMoonPerfectThresholdDeg] = useState<number>(
    () => Number(localStorage.getItem('moonPerfectThresholdDeg')) || 30,
  )

  function handleMoonPerfectThresholdDegChange(deg: number) {
    setMoonPerfectThresholdDeg(deg)
    localStorage.setItem('moonPerfectThresholdDeg', String(deg))
  }

  const [altitudeRatingEnabled, setAltitudeRatingEnabled] = useState<boolean>(
    () => (localStorage.getItem('altitudeRatingEnabled') ?? 'true') === 'true',
  )

  function handleAltitudeRatingEnabledChange(enabled: boolean) {
    setAltitudeRatingEnabled(enabled)
    localStorage.setItem('altitudeRatingEnabled', String(enabled))
  }

  // Altitude rating tiers: same Bad/Good/Perfect shape, driven by average altitude
  // while up tonight (higher is better, opposite direction from the Moon rating).
  const [altitudeGoodThresholdDeg, setAltitudeGoodThresholdDeg] = useState<number>(
    () => Number(localStorage.getItem('altitudeGoodThresholdDeg')) || 30,
  )

  function handleAltitudeGoodThresholdDegChange(deg: number) {
    setAltitudeGoodThresholdDeg(deg)
    localStorage.setItem('altitudeGoodThresholdDeg', String(deg))
  }

  const [altitudePerfectThresholdDeg, setAltitudePerfectThresholdDeg] = useState<number>(
    () => Number(localStorage.getItem('altitudePerfectThresholdDeg')) || 50,
  )

  function handleAltitudePerfectThresholdDegChange(deg: number) {
    setAltitudePerfectThresholdDeg(deg)
    localStorage.setItem('altitudePerfectThresholdDeg', String(deg))
  }

  const [moonListMetric, setMoonListMetric] = useState<MoonListMetric>(
    () => (localStorage.getItem('moonListMetric') as MoonListMetric | null) ?? 'closest',
  )

  function handleMoonListMetricChange(metric: MoonListMetric) {
    setMoonListMetric(metric)
    localStorage.setItem('moonListMetric', metric)
  }

  const [altitudeListMetric, setAltitudeListMetric] = useState<AltitudeListMetric>(
    () => (localStorage.getItem('altitudeListMetric') as AltitudeListMetric | null) ?? 'average',
  )

  function handleAltitudeListMetricChange(metric: AltitudeListMetric) {
    setAltitudeListMetric(metric)
    localStorage.setItem('altitudeListMetric', metric)
  }

  const [showMoonPanel, setShowMoonPanel] = useState<boolean>(
    () => (localStorage.getItem('showMoonPanel') ?? 'true') === 'true',
  )

  function handleShowMoonPanelChange(show: boolean) {
    setShowMoonPanel(show)
    localStorage.setItem('showMoonPanel', String(show))
  }

  const [seestarSourceDirectory, setSeestarSourceDirectory] = useState<string>(
    () => localStorage.getItem('seestarSourceDirectory') ?? DEFAULT_SEESTAR_SOURCE_DIR,
  )

  function handleSeestarSourceDirectoryChange(directory: string) {
    setSeestarSourceDirectory(directory)
    localStorage.setItem('seestarSourceDirectory', directory)
  }

  const [autoReanalyzeAfterImport, setAutoReanalyzeAfterImport] = useState<boolean>(
    () => (localStorage.getItem('autoReanalyzeAfterImport') ?? 'true') === 'true',
  )

  function handleAutoReanalyzeAfterImportChange(enabled: boolean) {
    setAutoReanalyzeAfterImport(enabled)
    localStorage.setItem('autoReanalyzeAfterImport', String(enabled))
  }

  const [objectImagesPath, setObjectImagesPath] = useState<string>(
    () => localStorage.getItem('objectImagesPath') ?? '',
  )

  function handleObjectImagesPathChange(path: string) {
    setObjectImagesPath(path)
    localStorage.setItem('objectImagesPath', path)
  }

  const [planningSeestarModel, setPlanningSeestarModel] = useState<SeestarModel>(
    () => (localStorage.getItem('planningSeestarModel') as SeestarModel | null) ?? DEFAULT_SEESTAR_MODEL,
  )

  function handlePlanningSeestarModelChange(model: SeestarModel) {
    setPlanningSeestarModel(model)
    localStorage.setItem('planningSeestarModel', model)
  }

  // Object type labels (Galaxy, Nebula, …) are one colour by default; switching this on
  // lets each type carry its own colour, chosen below.
  const [objectTypeColorsEnabled, setObjectTypeColorsEnabled] = useState<boolean>(
    () => localStorage.getItem('objectTypeColorsEnabled') === 'true',
  )

  function handleObjectTypeColorsEnabledChange(enabled: boolean) {
    setObjectTypeColorsEnabled(enabled)
    localStorage.setItem('objectTypeColorsEnabled', String(enabled))
  }

  const [objectTypeColors, setObjectTypeColors] = useState<Record<string, ObjectTypeColorKey>>(() => {
    try {
      const stored = localStorage.getItem('objectTypeColors')
      return stored ? (JSON.parse(stored) as Record<string, ObjectTypeColorKey>) : {}
    } catch {
      return {}
    }
  })

  function handleObjectTypeColorChange(type: string, color: ObjectTypeColorKey) {
    const next = { ...objectTypeColors, [type]: color }
    setObjectTypeColors(next)
    localStorage.setItem('objectTypeColors', JSON.stringify(next))
  }

  const [frameFitRatingEnabled, setFrameFitRatingEnabled] = useState<boolean>(
    () => (localStorage.getItem('frameFitRatingEnabled') ?? 'true') === 'true',
  )

  function handleFrameFitRatingEnabledChange(enabled: boolean) {
    setFrameFitRatingEnabled(enabled)
    localStorage.setItem('frameFitRatingEnabled', String(enabled))
  }

  // Frame-fit tiers, by portion of frame area: below "good" is Too small; up to
  // "mosaic" is Good; up to "too big" is Good for mosaic (mosaic mode stitches
  // several frames, so it comfortably covers objects that barely fit a single
  // frame or overflow it a bit); at/above "too big" is Too big even for mosaic.
  const [frameFitGoodThresholdPercent, setFrameFitGoodThresholdPercent] = useState<number>(
    () => Number(localStorage.getItem('frameFitGoodThresholdPercent')) || 3,
  )

  function handleFrameFitGoodThresholdPercentChange(percent: number) {
    setFrameFitGoodThresholdPercent(percent)
    localStorage.setItem('frameFitGoodThresholdPercent', String(percent))
  }

  const [frameFitMosaicThresholdPercent, setFrameFitMosaicThresholdPercent] = useState<number>(
    () => Number(localStorage.getItem('frameFitMosaicThresholdPercent')) || 90,
  )

  function handleFrameFitMosaicThresholdPercentChange(percent: number) {
    setFrameFitMosaicThresholdPercent(percent)
    localStorage.setItem('frameFitMosaicThresholdPercent', String(percent))
  }

  const [frameFitTooBigThresholdPercent, setFrameFitTooBigThresholdPercent] = useState<number>(
    () => Number(localStorage.getItem('frameFitTooBigThresholdPercent')) || 500,
  )

  function handleFrameFitTooBigThresholdPercentChange(percent: number) {
    setFrameFitTooBigThresholdPercent(percent)
    localStorage.setItem('frameFitTooBigThresholdPercent', String(percent))
  }

  const [proposalCatalogs, setProposalCatalogs] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('proposalCatalogs')
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set<string>(DEEP_SKY_CATALOGS)
  })

  function handleToggleProposalCatalog(catalog: string) {
    setProposalCatalogs((prev) => {
      const next = new Set(prev)
      if (next.has(catalog)) next.delete(catalog)
      else next.add(catalog)
      localStorage.setItem('proposalCatalogs', JSON.stringify([...next]))
      return next
    })
  }

  const [proposalTypes, setProposalTypes] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('proposalTypes')
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set<string>(FILTERABLE_OBJECT_TYPES)
  })

  function handleToggleProposalType(type: string) {
    setProposalTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      localStorage.setItem('proposalTypes', JSON.stringify([...next]))
      return next
    })
  }

  function readStoredOptionalNumber(key: string): number | null {
    const stored = localStorage.getItem(key)
    if (stored === null) return null
    const value = Number(stored)
    return Number.isNaN(value) ? null : value
  }

  function storeOptionalNumber(key: string, value: number | null) {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, String(value))
  }

  const [proposalMinFramePortionPercent, setProposalMinFramePortionPercent] = useState<number | null>(() =>
    readStoredOptionalNumber('proposalMinFramePortionPercent'),
  )

  function handleProposalMinFramePortionPercentChange(value: number | null) {
    setProposalMinFramePortionPercent(value)
    storeOptionalNumber('proposalMinFramePortionPercent', value)
  }

  const [proposalMaxFramePortionPercent, setProposalMaxFramePortionPercent] = useState<number | null>(() =>
    readStoredOptionalNumber('proposalMaxFramePortionPercent'),
  )

  function handleProposalMaxFramePortionPercentChange(value: number | null) {
    setProposalMaxFramePortionPercent(value)
    storeOptionalNumber('proposalMaxFramePortionPercent', value)
  }

  const [proposalMinMoonSeparationDeg, setProposalMinMoonSeparationDeg] = useState<number | null>(() =>
    readStoredOptionalNumber('proposalMinMoonSeparationDeg'),
  )

  function handleProposalMinMoonSeparationDegChange(value: number | null) {
    setProposalMinMoonSeparationDeg(value)
    storeOptionalNumber('proposalMinMoonSeparationDeg', value)
  }

  const [proposalMinAverageAltitudeDeg, setProposalMinAverageAltitudeDeg] = useState<number | null>(() =>
    readStoredOptionalNumber('proposalMinAverageAltitudeDeg'),
  )

  function handleProposalMinAverageAltitudeDegChange(value: number | null) {
    setProposalMinAverageAltitudeDeg(value)
    storeOptionalNumber('proposalMinAverageAltitudeDeg', value)
  }

  const [proposalLimit, setProposalLimit] = useState<number>(
    () => Number(localStorage.getItem('proposalLimit')) || 50,
  )

  function handleProposalLimitChange(limit: number) {
    setProposalLimit(limit)
    localStorage.setItem('proposalLimit', String(limit))
  }

  const [seestarStatus, setSeestarStatus] = useState<ConnectionStatus>('checking')

  const checkSeestarConnection = useCallback(() => {
    setSeestarStatus('checking')
    window.astroCatalogue
      .checkSeestarConnection(seestarSourceDirectory)
      .then((connected) => setSeestarStatus(connected ? 'connected' : 'disconnected'))
      .catch(() => setSeestarStatus('disconnected'))
  }, [seestarSourceDirectory])

  useEffect(() => {
    checkSeestarConnection()
  }, [checkSeestarConnection])

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem('viewMode', mode)
  }

  function handleToggleFrameType(name: string) {
    setSelectedFrameTypes((prev) => {
      const base = prev ?? new Set(allFrameTypeNames)
      const next = new Set(base)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function handleToggleMetric(key: MetricKey) {
    setSelectedMetrics((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    window.astroCatalogue.getCatalogue().then(setCatalogue).catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    return window.astroCatalogue.onScanProgress((progress) => {
      setScanProgressLabel(`Scanning… ${progress.objectsScanned} object(s) processed`)
    })
  }, [])


  async function handleSelectRoot() {
    const root = await window.astroCatalogue.selectRootDir()
    if (!root) return
    setCatalogue((prev) => ({
      rootPath: root,
      lastScannedAt: prev?.rootPath === root ? prev.lastScannedAt : null,
      objects: prev?.rootPath === root ? prev.objects : [],
      warnings: prev?.rootPath === root ? prev.warnings : [],
    }))
  }

  async function handleAnalyze() {
    if (!catalogue?.rootPath) return
    setScanning(true)
    setError(null)
    setScanProgressLabel('Scanning…')
    try {
      const result = await window.astroCatalogue.analyzeDirectory(catalogue.rootPath, directoryPattern)
      setCatalogue(result)
    } catch (e) {
      setError(String(e))
    } finally {
      setScanning(false)
      setScanProgressLabel(null)
    }
  }

  /** Re-analyses just the given top-level folders of the root, e.g. after an import. */
  async function handleAnalyzeDirectories(topLevelNames: string[]) {
    if (!catalogue?.rootPath || topLevelNames.length === 0) return
    setScanning(true)
    setError(null)
    setScanProgressLabel('Scanning imported objects…')
    try {
      const result = await window.astroCatalogue.analyzeDirectories(
        catalogue.rootPath,
        directoryPattern,
        topLevelNames,
      )
      setCatalogue(result)
    } catch (e) {
      setError(String(e))
      throw e
    } finally {
      setScanning(false)
      setScanProgressLabel(null)
    }
  }

  const groups = catalogue ? groupObjectsByCatalog(catalogue.objects) : []
  const effectiveSelectedCatalog =
    selectedCatalog !== null && groups.some((g) => g.catalog === selectedCatalog) ? selectedCatalog : null
  const groupFilterOptions = { selectedCatalog: effectiveSelectedCatalog, nameFilter, sortKey, sortDirection }
  const filteredGroups = catalogue ? buildFilteredSortedGroups(catalogue.objects, groupFilterOptions) : []
  const allFrameTypeNames = catalogue
    ? Array.from(new Set(catalogue.objects.flatMap((o) => o.frameTypes.map((ft) => ft.name)))).sort()
    : []
  const effectiveSelectedFrameTypes = selectedFrameTypes ?? new Set(allFrameTypeNames)
  const isPlanning = activeSection === 'planning'

  const duplicateGroups = useMemo(
    () => (catalogue ? findDuplicateTargetGroups(catalogue.objects, manualTargetLinks) : []),
    [catalogue, manualTargetLinks],
  )
  const duplicatesKey = duplicateGroups.map((group) => group.signature).join('~')
  const showDuplicatesBanner = duplicateGroups.length > 0 && dismissedDuplicatesKey !== duplicatesKey

  function dismissDuplicatesBanner() {
    setDismissedDuplicatesKey(duplicatesKey)
    localStorage.setItem('dismissedDuplicatesKey', duplicatesKey)
  }

  // filteredGroups is rebuilt every render, so memoising on it would never hit.
  const catalogueTotals = summarizeObjects(filteredGroups.flatMap((group) => group.objects))
  const catalogueTotalsFiltered = effectiveSelectedCatalog !== null || nameFilter.trim() !== ''
  const effectiveSelectedMetrics = isPlanning
    ? new Set([...selectedMetrics].filter((m) => m !== 'size'))
    : selectedMetrics

  const existingCatalogueKeys = useMemo(
    () =>
      new Set(
        (catalogue?.objects ?? [])
          .filter((o): o is typeof o & { catalogNumber: number } => o.catalogNumber !== null)
          .map((o) => `${o.catalog}:${o.catalogNumber}`),
      ),
    [catalogue],
  )

  const proposedObjects = useMemo(() => {
    if (!isPlanning) return []
    return getProposedObjects(
      existingCatalogueKeys,
      {
        catalogs: proposalCatalogs,
        types: proposalTypes,
        minFramePortionPercent: proposalMinFramePortionPercent,
        maxFramePortionPercent: proposalMaxFramePortionPercent,
        minMoonSeparationDeg: proposalMinMoonSeparationDeg,
        minAverageAltitudeDeg: proposalMinAverageAltitudeDeg,
      },
      planningSeestarModel,
      observingLocation,
      nightMoonTrack,
    )
  }, [
    isPlanning,
    existingCatalogueKeys,
    proposalCatalogs,
    proposalTypes,
    proposalMinFramePortionPercent,
    proposalMaxFramePortionPercent,
    proposalMinMoonSeparationDeg,
    proposalMinAverageAltitudeDeg,
    planningSeestarModel,
    observingLocation,
    nightMoonTrack,
  ])

  const proposedGroups = buildFilteredSortedGroups(proposedObjects, groupFilterOptions)
  const totalProposalMatches = proposedGroups.reduce((sum, g) => sum + g.objects.length, 0)
  const cappedProposedGroups = capGroupObjects(proposedGroups, proposalLimit)
  const shownProposalCount = cappedProposedGroups.reduce((sum, g) => sum + g.objects.length, 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        rootPath={catalogue?.rootPath ?? null}
        lastScannedAt={catalogue?.lastScannedAt ?? null}
        scanning={scanning}
        scanProgressLabel={scanProgressLabel}
        onSelectRoot={handleSelectRoot}
        onAnalyze={handleAnalyze}
        seestarStatus={seestarStatus}
        onCheckSeestarConnection={checkSeestarConnection}
        warningCount={catalogue?.warnings.length ?? 0}
        onWarningsClick={() => setActiveSection('seestar')}
      />

      <div className="mx-auto flex max-w-[96rem] gap-8 px-6 py-8">
        <AppNav active={activeSection} onSelect={setActiveSection} />

        <div className="min-w-0 flex-1">
        {activeSection === 'seestar' ? (
          <SeestarView
            defaultTargetDirectory={catalogue?.rootPath ?? null}
            directoryPattern={directoryPattern}
            status={seestarStatus}
            onCheckConnection={checkSeestarConnection}
            warnings={catalogue?.warnings ?? []}
            sourceDirectory={seestarSourceDirectory}
            catalogueRootPath={catalogue?.rootPath ?? null}
            reanalyzeAfterImportDefault={autoReanalyzeAfterImport}
            onImportedDirectories={handleAnalyzeDirectories}
          />
        ) : activeSection === 'configuration' ? (
          <ConfigurationView
            directoryPattern={directoryPattern}
            onDirectoryPatternChange={handleDirectoryPatternChange}
            targetDirectory={catalogue?.rootPath ?? null}
            observingLocation={observingLocation}
            onObservingLocationChange={handleObservingLocationChange}
            moonPanelNights={moonPanelNights}
            onMoonPanelNightsChange={handleMoonPanelNightsChange}
            highlightTonight={highlightTonight}
            onHighlightTonightChange={handleHighlightTonightChange}
            showMoonPanel={showMoonPanel}
            onShowMoonPanelChange={handleShowMoonPanelChange}
            moonRatingEnabled={moonRatingEnabled}
            onMoonRatingEnabledChange={handleMoonRatingEnabledChange}
            moonGoodThresholdDeg={moonGoodThresholdDeg}
            onMoonGoodThresholdDegChange={handleMoonGoodThresholdDegChange}
            moonPerfectThresholdDeg={moonPerfectThresholdDeg}
            onMoonPerfectThresholdDegChange={handleMoonPerfectThresholdDegChange}
            altitudeRatingEnabled={altitudeRatingEnabled}
            onAltitudeRatingEnabledChange={handleAltitudeRatingEnabledChange}
            altitudeGoodThresholdDeg={altitudeGoodThresholdDeg}
            onAltitudeGoodThresholdDegChange={handleAltitudeGoodThresholdDegChange}
            altitudePerfectThresholdDeg={altitudePerfectThresholdDeg}
            onAltitudePerfectThresholdDegChange={handleAltitudePerfectThresholdDegChange}
            moonListMetric={moonListMetric}
            onMoonListMetricChange={handleMoonListMetricChange}
            altitudeListMetric={altitudeListMetric}
            onAltitudeListMetricChange={handleAltitudeListMetricChange}
            seestarSourceDirectory={seestarSourceDirectory}
            onSeestarSourceDirectoryChange={handleSeestarSourceDirectoryChange}
            objectImagesPath={objectImagesPath}
            onObjectImagesPathChange={handleObjectImagesPathChange}
            autoReanalyzeAfterImport={autoReanalyzeAfterImport}
            onAutoReanalyzeAfterImportChange={handleAutoReanalyzeAfterImportChange}
            frameFitRatingEnabled={frameFitRatingEnabled}
            onFrameFitRatingEnabledChange={handleFrameFitRatingEnabledChange}
            frameFitGoodThresholdPercent={frameFitGoodThresholdPercent}
            onFrameFitGoodThresholdPercentChange={handleFrameFitGoodThresholdPercentChange}
            frameFitMosaicThresholdPercent={frameFitMosaicThresholdPercent}
            onFrameFitMosaicThresholdPercentChange={handleFrameFitMosaicThresholdPercentChange}
            frameFitTooBigThresholdPercent={frameFitTooBigThresholdPercent}
            onFrameFitTooBigThresholdPercentChange={handleFrameFitTooBigThresholdPercentChange}
            objectTypeColorsEnabled={objectTypeColorsEnabled}
            onObjectTypeColorsEnabledChange={handleObjectTypeColorsEnabledChange}
            objectTypeColors={objectTypeColors}
            onObjectTypeColorChange={handleObjectTypeColorChange}
          />
        ) : (
        <>
        {catalogue && catalogue.objects.length > 0 && (
          <div className="mb-6 border-b border-white/10 pb-4">
            <Sidebar
              groups={groups}
              totalCount={catalogue.objects.length}
              selectedCatalog={effectiveSelectedCatalog}
              onSelect={setSelectedCatalog}
            />
          </div>
        )}

        {activeSection === 'planning' && showMoonPanel && (
          <div className="mb-6">
            <MoonPanel location={observingLocation} nights={moonPanelNights} highlightTonight={highlightTonight} />
          </div>
        )}

        <main className="min-w-0">
          {error && (
            <div className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {!isPlanning && showDuplicatesBanner && (
            <DuplicateTargetsBanner
              groupCount={duplicateGroups.length}
              onReview={() => setMergeModalOpen(true)}
              onDismiss={dismissDuplicatesBanner}
            />
          )}

          {catalogue && catalogue.objects.length > 0 && (
            <div className="mb-6 flex items-center justify-between gap-3">
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Filter by name…"
                className="w-full max-w-xs rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
              />
              <div className="flex items-center gap-3">
                {isPlanning && (
                  <SeestarModelSelect value={planningSeestarModel} onChange={handlePlanningSeestarModelChange} />
                )}
                <SortControl
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSortKeyChange={setSortKey}
                  onSortDirectionChange={setSortDirection}
                />
                <ColumnFilter
                  frameTypeOptions={allFrameTypeNames}
                  selectedFrameTypes={effectiveSelectedFrameTypes}
                  onToggleFrameType={handleToggleFrameType}
                  showTotal={showTotal}
                  onToggleTotal={() => setShowTotal((s) => !s)}
                  selectedMetrics={effectiveSelectedMetrics}
                  onToggleMetric={handleToggleMetric}
                  hiddenMetrics={isPlanning ? new Set<MetricKey>(['size']) : undefined}
                  isPlanning={isPlanning}
                />
                <ViewToggle value={viewMode} onChange={handleViewModeChange} />
              </div>
            </div>
          )}

          {!catalogue?.rootPath ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24 text-center text-slate-400">
              <p className="mb-1 text-base">No directory selected yet</p>
              <p className="text-sm">Select your astrophoto root directory to get started</p>
            </div>
          ) : catalogue.objects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24 text-center text-slate-400">
              <p className="mb-1 text-base">No objects catalogued yet</p>
              <p className="text-sm">Click Analyze to scan the selected directory</p>
            </div>
          ) : isPlanning ? (
            <div className="space-y-10">
              <section>
                <h2 className="mb-4 text-xl font-bold text-slate-100">Already in catalogue</h2>
                {filteredGroups.length === 0 ? (
                  <p className="text-sm text-slate-400">No catalogued objects match your filter</p>
                ) : (
                  <ObjectGroupsGrid
                    groups={filteredGroups}
                    viewMode={viewMode}
                    warnings={catalogue.warnings}
                    onSelectObject={setSelectedObject}
                    visibleFrameTypes={effectiveSelectedFrameTypes}
                    showTotal={showTotal}
                    visibleMetrics={effectiveSelectedMetrics}
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
                    seestarModel={planningSeestarModel}
                    frameFitRatingEnabled={frameFitRatingEnabled}
                    frameFitGoodThresholdPercent={frameFitGoodThresholdPercent}
                    frameFitMosaicThresholdPercent={frameFitMosaicThresholdPercent}
                    frameFitTooBigThresholdPercent={frameFitTooBigThresholdPercent}
                    imagesPath={objectImagesPath}
                    objectTypeColorsEnabled={objectTypeColorsEnabled}
                    objectTypeColors={objectTypeColors}
                    collapseStorageKey="collapsedCatalogs.planningCatalogued"
                  />
                )}
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-slate-100">Propositions</h2>
                <PropositionFilters
                  catalogs={proposalCatalogs}
                  onToggleCatalog={handleToggleProposalCatalog}
                  types={proposalTypes}
                  onToggleType={handleToggleProposalType}
                  minFramePortionPercent={proposalMinFramePortionPercent}
                  onMinFramePortionPercentChange={handleProposalMinFramePortionPercentChange}
                  maxFramePortionPercent={proposalMaxFramePortionPercent}
                  onMaxFramePortionPercentChange={handleProposalMaxFramePortionPercentChange}
                  minMoonSeparationDeg={proposalMinMoonSeparationDeg}
                  onMinMoonSeparationDegChange={handleProposalMinMoonSeparationDegChange}
                  minAverageAltitudeDeg={proposalMinAverageAltitudeDeg}
                  onMinAverageAltitudeDegChange={handleProposalMinAverageAltitudeDegChange}
                  limit={proposalLimit}
                  onLimitChange={handleProposalLimitChange}
                />
                <p className="mb-4 text-xs text-slate-400">
                  Catalog objects you haven't captured yet, matching the filters above.
                  {totalProposalMatches > shownProposalCount &&
                    ` Showing the first ${shownProposalCount} of ${totalProposalMatches} matches — narrow the filters or raise the limit to see more.`}
                </p>
                {cappedProposedGroups.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    {observingLocation
                      ? 'No matching objects found outside your catalogue.'
                      : 'Set your observing location in Configuration to filter propositions by Moon distance or altitude.'}
                  </p>
                ) : (
                  <ObjectGroupsGrid
                    groups={cappedProposedGroups}
                    viewMode={viewMode}
                    warnings={[]}
                    onSelectObject={setSelectedObject}
                    visibleFrameTypes={effectiveSelectedFrameTypes}
                    showTotal={false}
                    visibleMetrics={effectiveSelectedMetrics}
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
                    seestarModel={planningSeestarModel}
                    frameFitRatingEnabled={frameFitRatingEnabled}
                    frameFitGoodThresholdPercent={frameFitGoodThresholdPercent}
                    frameFitMosaicThresholdPercent={frameFitMosaicThresholdPercent}
                    frameFitTooBigThresholdPercent={frameFitTooBigThresholdPercent}
                    imagesPath={objectImagesPath}
                    objectTypeColorsEnabled={objectTypeColorsEnabled}
                    objectTypeColors={objectTypeColors}
                    collapseStorageKey="collapsedCatalogs.planningProposals"
                  />
                )}
              </section>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24 text-center text-slate-400">
              <p className="mb-1 text-base">No objects match your filter</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <>
            <CatalogueSummary totals={catalogueTotals} filtered={catalogueTotalsFiltered} />
            <ObjectGroupsGrid
              groups={filteredGroups}
              viewMode={viewMode}
              warnings={catalogue.warnings}
              onSelectObject={setSelectedObject}
              visibleFrameTypes={effectiveSelectedFrameTypes}
              showTotal={showTotal}
              visibleMetrics={effectiveSelectedMetrics}
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
              seestarModel={planningSeestarModel}
              frameFitRatingEnabled={frameFitRatingEnabled}
              frameFitGoodThresholdPercent={frameFitGoodThresholdPercent}
              frameFitMosaicThresholdPercent={frameFitMosaicThresholdPercent}
              frameFitTooBigThresholdPercent={frameFitTooBigThresholdPercent}
              imagesPath={objectImagesPath}
              objectTypeColorsEnabled={objectTypeColorsEnabled}
              objectTypeColors={objectTypeColors}
              collapseStorageKey="collapsedCatalogs.catalogue"
            />
            </>
          )}
        </main>
        </>
        )}
        </div>
      </div>

      {mergeModalOpen && catalogue?.rootPath && (
        <MergeTargetsModal
          groups={duplicateGroups}
          rootPath={catalogue.rootPath}
          directoryPattern={directoryPattern}
          allObjects={catalogue.objects}
          manualLinks={manualTargetLinks}
          onAddManualLink={handleAddManualLink}
          onRemoveManualLink={handleRemoveManualLink}
          onMerged={handleAnalyzeDirectories}
          onClose={() => setMergeModalOpen(false)}
        />
      )}

      {renamingObject && catalogue?.rootPath && (
        <RenameObjectModal
          key={renamingObject.path}
          object={renamingObject}
          rootPath={catalogue.rootPath}
          directoryPattern={directoryPattern}
          onRenamed={async (affectedTopLevelNames) => {
            await handleAnalyzeDirectories(affectedTopLevelNames)
            setRenamingObject(null)
            setSelectedObject(null)
          }}
          onClose={() => setRenamingObject(null)}
        />
      )}

      {selectedObject && catalogue && !renamingObject && (
        <ObjectDetailModal
          key={selectedObject.path}
          object={selectedObject}
          warnings={catalogue.warnings}
          observingLocation={observingLocation}
          nightMoonTrack={nightMoonTrack}
          seestarModel={planningSeestarModel}
          frameFitRatingEnabled={frameFitRatingEnabled}
          frameFitGoodThresholdPercent={frameFitGoodThresholdPercent}
          frameFitMosaicThresholdPercent={frameFitMosaicThresholdPercent}
          frameFitTooBigThresholdPercent={frameFitTooBigThresholdPercent}
          imagesPath={objectImagesPath}
          objectTypeColorsEnabled={objectTypeColorsEnabled}
          objectTypeColors={objectTypeColors}
          onRename={() => setRenamingObject(selectedObject)}
          onClose={() => setSelectedObject(null)}
        />
      )}
    </div>
  )
}
