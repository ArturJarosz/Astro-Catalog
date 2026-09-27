import { useState } from 'react'
import {
  DEFAULT_SEESTAR_DIRECTORY_PATTERN,
  DEFAULT_SEESTAR_SOURCE_DIR_LINUX,
  DEFAULT_SEESTAR_SOURCE_DIR_WINDOWS,
} from '../../electron/shared-types'
import {
  ALTITUDE_LIST_METRIC_LABELS,
  MOON_LIST_METRIC_LABELS,
  type AltitudeListMetric,
  type MoonListMetric,
} from '../lib/moonSeparation'
import type { ObservingLocation } from '../lib/observingLocation'
import { labelForObjectType } from '../lib/objectType'
import { ObjectTypeColorPicker } from './ObjectTypeColorPicker'
import {
  CONFIGURABLE_OBJECT_TYPES,
  objectTypeColorKey,
  type ObjectTypeColorKey,
} from '../lib/objectTypeColor'

interface ConfigurationViewProps {
  directoryPattern: string
  onDirectoryPatternChange: (pattern: string) => void
  targetDirectory: string | null
  observingLocation: ObservingLocation | null
  onObservingLocationChange: (location: ObservingLocation) => void
  moonPanelNights: number
  onMoonPanelNightsChange: (nights: number) => void
  highlightTonight: boolean
  onHighlightTonightChange: (highlight: boolean) => void
  showMoonPanel: boolean
  onShowMoonPanelChange: (show: boolean) => void
  moonRatingEnabled: boolean
  onMoonRatingEnabledChange: (enabled: boolean) => void
  moonGoodThresholdDeg: number
  onMoonGoodThresholdDegChange: (deg: number) => void
  moonPerfectThresholdDeg: number
  onMoonPerfectThresholdDegChange: (deg: number) => void
  altitudeRatingEnabled: boolean
  onAltitudeRatingEnabledChange: (enabled: boolean) => void
  altitudeGoodThresholdDeg: number
  onAltitudeGoodThresholdDegChange: (deg: number) => void
  altitudePerfectThresholdDeg: number
  onAltitudePerfectThresholdDegChange: (deg: number) => void
  moonListMetric: MoonListMetric
  onMoonListMetricChange: (metric: MoonListMetric) => void
  altitudeListMetric: AltitudeListMetric
  onAltitudeListMetricChange: (metric: AltitudeListMetric) => void
  seestarSourceDirectory: string
  onSeestarSourceDirectoryChange: (directory: string) => void
  objectImagesPath: string
  onObjectImagesPathChange: (path: string) => void
  frameFitRatingEnabled: boolean
  onFrameFitRatingEnabledChange: (enabled: boolean) => void
  frameFitGoodThresholdPercent: number
  onFrameFitGoodThresholdPercentChange: (percent: number) => void
  frameFitMosaicThresholdPercent: number
  onFrameFitMosaicThresholdPercentChange: (percent: number) => void
  frameFitTooBigThresholdPercent: number
  onFrameFitTooBigThresholdPercentChange: (percent: number) => void
  autoReanalyzeAfterImport: boolean
  onAutoReanalyzeAfterImportChange: (enabled: boolean) => void
  objectTypeColorsEnabled: boolean
  onObjectTypeColorsEnabledChange: (enabled: boolean) => void
  objectTypeColors: Record<string, ObjectTypeColorKey>
  onObjectTypeColorChange: (type: string, color: ObjectTypeColorKey) => void
}

type ConfigTab = 'general' | 'planning'

const CONFIG_TABS: { id: ConfigTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'planning', label: 'Planning' },
]

const MOON_PANEL_NIGHTS_OPTIONS = [3, 5, 7, 10, 14]

const PATTERN_EXAMPLE_VALUES = { object: 'M 51', type: 'LP', date: '2026.08.09', exposure: '20s' }

const PATTERN_EXAMPLES = [
  '{object}/{type}/{date} {type} {exposure}',
  '{type}/{object}/{date} {exposure}',
  '{object}/{date}/{type}',
]

function previewPatternPath(pattern: string): string {
  const filled = pattern
    .replaceAll('{object}', PATTERN_EXAMPLE_VALUES.object)
    .replaceAll('{type}', PATTERN_EXAMPLE_VALUES.type)
    .replaceAll('{date}', PATTERN_EXAMPLE_VALUES.date)
    .replaceAll('{exposure}', PATTERN_EXAMPLE_VALUES.exposure)

  const segments = filled
    .split(/[/\\]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  return segments.join(' / ')
}

export function ConfigurationView({
  directoryPattern,
  onDirectoryPatternChange,
  targetDirectory,
  observingLocation,
  onObservingLocationChange,
  moonPanelNights,
  onMoonPanelNightsChange,
  highlightTonight,
  onHighlightTonightChange,
  showMoonPanel,
  onShowMoonPanelChange,
  moonRatingEnabled,
  onMoonRatingEnabledChange,
  moonGoodThresholdDeg,
  onMoonGoodThresholdDegChange,
  moonPerfectThresholdDeg,
  onMoonPerfectThresholdDegChange,
  altitudeRatingEnabled,
  onAltitudeRatingEnabledChange,
  altitudeGoodThresholdDeg,
  onAltitudeGoodThresholdDegChange,
  altitudePerfectThresholdDeg,
  onAltitudePerfectThresholdDegChange,
  moonListMetric,
  onMoonListMetricChange,
  altitudeListMetric,
  onAltitudeListMetricChange,
  seestarSourceDirectory,
  onSeestarSourceDirectoryChange,
  objectImagesPath,
  onObjectImagesPathChange,
  frameFitRatingEnabled,
  onFrameFitRatingEnabledChange,
  frameFitGoodThresholdPercent,
  onFrameFitGoodThresholdPercentChange,
  frameFitMosaicThresholdPercent,
  onFrameFitMosaicThresholdPercentChange,
  frameFitTooBigThresholdPercent,
  onFrameFitTooBigThresholdPercentChange,
  autoReanalyzeAfterImport,
  onAutoReanalyzeAfterImportChange,
  objectTypeColorsEnabled,
  onObjectTypeColorsEnabledChange,
  objectTypeColors,
  onObjectTypeColorChange,
}: ConfigurationViewProps) {
  const [activeTab, setActiveTab] = useState<ConfigTab>('general')
  const [latInput, setLatInput] = useState(observingLocation ? String(observingLocation.latitude) : '')
  const [lonInput, setLonInput] = useState(observingLocation ? String(observingLocation.longitude) : '')
  const [locationLookupPending, setLocationLookupPending] = useState(false)
  const [locationLookupError, setLocationLookupError] = useState<string | null>(null)
  const [sourceDirectoryInput, setSourceDirectoryInput] = useState(seestarSourceDirectory)
  const sourceDirectoryDirty = sourceDirectoryInput !== seestarSourceDirectory

  function handleGoodThresholdChange(value: string) {
    const deg = Number.parseFloat(value)
    if (Number.isNaN(deg) || deg < 0) return
    onMoonGoodThresholdDegChange(deg)
  }

  function handlePerfectThresholdChange(value: string) {
    const deg = Number.parseFloat(value)
    if (Number.isNaN(deg) || deg < 0) return
    onMoonPerfectThresholdDegChange(deg)
  }

  function handleAltitudeGoodThresholdChange(value: string) {
    const deg = Number.parseFloat(value)
    if (Number.isNaN(deg) || deg < 0) return
    onAltitudeGoodThresholdDegChange(deg)
  }

  function handleAltitudePerfectThresholdChange(value: string) {
    const deg = Number.parseFloat(value)
    if (Number.isNaN(deg) || deg < 0) return
    onAltitudePerfectThresholdDegChange(deg)
  }

  function handleFrameFitGoodThresholdChange(value: string) {
    const percent = Number.parseFloat(value)
    if (Number.isNaN(percent) || percent < 0) return
    onFrameFitGoodThresholdPercentChange(percent)
  }

  function handleFrameFitMosaicThresholdChange(value: string) {
    const percent = Number.parseFloat(value)
    if (Number.isNaN(percent) || percent < 0) return
    onFrameFitMosaicThresholdPercentChange(percent)
  }

  function handleFrameFitTooBigThresholdChange(value: string) {
    const percent = Number.parseFloat(value)
    if (Number.isNaN(percent) || percent < 0) return
    onFrameFitTooBigThresholdPercentChange(percent)
  }

  function applySourceDirectory() {
    const trimmed = sourceDirectoryInput.trim()
    if (!trimmed) return
    onSeestarSourceDirectoryChange(trimmed)
  }

  async function handleBrowseObjectImagesPath() {
    const dir = await window.astroCatalogue.selectObjectImagesDir()
    if (dir) onObjectImagesPathChange(dir)
  }

  function handleSaveLocation() {
    const latitude = Number.parseFloat(latInput)
    const longitude = Number.parseFloat(lonInput)
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return
    onObservingLocationChange({ latitude, longitude })
  }

  async function handleUseCurrentLocation() {
    setLocationLookupPending(true)
    setLocationLookupError(null)
    try {
      const result = await window.astroCatalogue.getCurrentLocation()
      if (!result.ok) {
        setLocationLookupError(result.error)
        return
      }
      setLatInput(String(result.latitude))
      setLonInput(String(result.longitude))
      onObservingLocationChange({ latitude: result.latitude, longitude: result.longitude })
    } catch {
      setLocationLookupError('Location lookup failed.')
    } finally {
      setLocationLookupPending(false)
    }
  }

  return (
    <div className="flex gap-8">
      <nav className="w-40 shrink-0 space-y-1">
        {CONFIG_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-white/10 text-slate-100'
                : 'text-slate-300 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 space-y-6">
      {activeTab === 'general' && (
      <>
      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Observing location</h2>
        <p className="mb-3 text-xs text-slate-400">
          Your position on Earth. Used for every altitude, visibility and moon-separation calculation across the
          app — the Moon Panel, object ratings and the planning proposals all read it.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Latitude
            <input
              type="text"
              inputMode="decimal"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="e.g. 51.5074"
              className="w-32 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Longitude
            <input
              type="text"
              inputMode="decimal"
              value={lonInput}
              onChange={(e) => setLonInput(e.target.value)}
              placeholder="e.g. -0.1278"
              className="w-32 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
            />
          </label>
          <button
            onClick={handleSaveLocation}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Save
          </button>
          <button
            onClick={handleUseCurrentLocation}
            disabled={locationLookupPending}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {locationLookupPending ? 'Locating…' : 'Use current location'}
          </button>
        </div>

        {locationLookupError && <p className="mt-2 text-xs text-rose-400">{locationLookupError}</p>}

        {observingLocation && (
          <p className="mt-2 text-xs text-slate-400">
            Currently set to{' '}
            <code className="text-slate-200">
              {observingLocation.latitude}, {observingLocation.longitude}
            </code>
          </p>
        )}

      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">After import</h2>
        <p className="mb-3 text-xs text-slate-400">
          Default state of the "Re-analyse imported objects" tick on the Seestar tab. Only the object folders that
          received new files are re-scanned, so the catalogue is up to date without a full re-analysis.
        </p>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={autoReanalyzeAfterImport}
            onChange={(e) => onAutoReanalyzeAfterImportChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-sky-500"
          />
          Re-analyse imported objects after an import
        </label>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Seestar source path</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={sourceDirectoryInput}
            onChange={(e) => setSourceDirectoryInput(e.target.value)}
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-slate-200 placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
          />
          <button
            onClick={applySourceDirectory}
            disabled={!sourceDirectoryDirty || sourceDirectoryInput.trim() === ''}
            className="shrink-0 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          The folder the app reads from when checking the Seestar connection and importing photos — this is where
          your Seestar exposes its <code className="text-slate-300">MyWorks</code> folder, either as a network share
          or a mounted/mapped local path.
        </p>
        <div className="mt-3 space-y-1 text-xs text-slate-400">
          <p>
            <span className="text-slate-300">Recommended on Windows:</span>{' '}
            <code className="text-slate-200">{DEFAULT_SEESTAR_SOURCE_DIR_WINDOWS}</code>
            {' — '}the Seestar's SMB share addressed directly by its hostname.
          </p>
          <p>
            <span className="text-slate-300">Recommended on Linux:</span>{' '}
            <code className="text-slate-200">{DEFAULT_SEESTAR_SOURCE_DIR_LINUX}</code>
            {' — '}mount the same SMB share first (e.g. with <code className="text-slate-300">gvfs</code> or a{' '}
            <code className="text-slate-300">cifs</code> mount) and point this at the mount point.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Directory pattern</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={directoryPattern}
            onChange={(e) => onDirectoryPatternChange(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-slate-200 placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
          />
          <button
            onClick={() => onDirectoryPatternChange(DEFAULT_SEESTAR_DIRECTORY_PATTERN)}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Reset
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Used both when importing from the Seestar and when analyzing your catalogue's root directory — it defines the
          folder layout that lays out each object's frames. Use <code className="text-slate-300">/</code> to separate
          directory levels — each segment becomes one folder.
        </p>

        <table className="mt-3 w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="py-1 pr-4 font-medium">Token</th>
              <th className="py-1 pr-4 font-medium">Means</th>
              <th className="py-1 font-medium">Example value</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-t border-white/5">
              <td className="py-1 pr-4 font-mono text-slate-200">{'{object}'}</td>
              <td className="py-1 pr-4">Object name, from the source _sub folder</td>
              <td className="py-1 font-mono">M 51</td>
            </tr>
            <tr className="border-t border-white/5">
              <td className="py-1 pr-4 font-mono text-slate-200">{'{type}'}</td>
              <td className="py-1 pr-4">Frame type — IRCUT or LP for light frames, or the target name (e.g. Lunar) for Sun/Moon/planet video</td>
              <td className="py-1 font-mono">LP</td>
            </tr>
            <tr className="border-t border-white/5">
              <td className="py-1 pr-4 font-mono text-slate-200">{'{date}'}</td>
              <td className="py-1 pr-4">Capture date, formatted YYYY.MM.DD</td>
              <td className="py-1 font-mono">2026.08.09</td>
            </tr>
            <tr className="border-t border-white/5">
              <td className="py-1 pr-4 font-mono text-slate-200">{'{exposure}'}</td>
              <td className="py-1 pr-4">Single-frame exposure length</td>
              <td className="py-1 font-mono">20s</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 space-y-1 text-xs text-slate-400">
          <p className="text-slate-300">Examples (for M 51, LP, 2026.08.09, 20s):</p>
          {PATTERN_EXAMPLES.map((example) => (
            <p key={example}>
              <code className="text-slate-300">{example}</code>
              {' → '}
              <code className="text-slate-200">{previewPatternPath(example)}</code>
            </p>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Preview with your current pattern:{' '}
          <code className="text-slate-200">
            {targetDirectory ?? '<target directory>'} / {previewPatternPath(directoryPattern)}
          </code>
        </p>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Object images</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={objectImagesPath}
            onChange={(e) => onObjectImagesPathChange(e.target.value)}
            placeholder="e.g. /home/you/astro-images"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-sm text-slate-200 placeholder:text-slate-400 focus:border-white/20 focus:outline-none"
          />
          <button
            onClick={handleBrowseObjectImagesPath}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
          >
            Browse…
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          A folder of your own object pictures. If it contains a <code className="text-slate-300">.jpg</code> or{' '}
          <code className="text-slate-300">.png</code> file whose name matches an object (e.g.{' '}
          <code className="text-slate-300">M 31.jpg</code>), that picture is shown everywhere instead of the
          Wikipedia thumbnail. Objects without a matching file keep using Wikipedia.
        </p>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Object type labels</h2>
        <p className="mb-3 text-xs text-slate-400">
          The small badge on each object showing what it is (Galaxy, Planetary nebula, …), on the object cards and
          in the object detail window.
        </p>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={objectTypeColorsEnabled}
            onChange={(e) => onObjectTypeColorsEnabledChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-sky-500"
          />
          Give each object type its own colour
        </label>

        {objectTypeColorsEnabled ? (
          <>
            <p className="mt-4 mb-2 text-xs text-slate-400">Click a label to change its colour.</p>
            <div className="flex flex-wrap gap-2">
              {CONFIGURABLE_OBJECT_TYPES.map((type) => (
                <ObjectTypeColorPicker
                  key={type}
                  label={labelForObjectType(type) ?? type}
                  value={objectTypeColorKey(type, true, objectTypeColors)}
                  onChange={(color) => onObjectTypeColorChange(type, color)}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 text-xs text-slate-400">
            All object types share one colour. Tick the box above to pick a colour per type.
          </p>
        )}
      </section>
      </>
      )}

      {activeTab === 'planning' && (
      <>
      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Moon Panel</h2>
        <p className="mb-3 text-xs text-slate-400">
          Controls the "Next Good Nights" panel on the Catalogue tab, which shows moon illumination and rise/set
          times.
        </p>

        <label className="mb-4 flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showMoonPanel}
            onChange={(e) => onShowMoonPanelChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-sky-500"
          />
          Show the Moon Panel on the Catalogue tab
        </label>

        <div className="mt-4 flex items-center gap-3">
          <label className="text-xs text-slate-300" htmlFor="moon-panel-nights">
            Nights to show
          </label>
          <select
            id="moon-panel-nights"
            value={moonPanelNights}
            onChange={(e) => onMoonPanelNightsChange(Number(e.target.value))}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
          >
            {MOON_PANEL_NIGHTS_OPTIONS.map((n) => (
              <option key={n} value={n} className="bg-slate-800">
                {n}
              </option>
            ))}
          </select>
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={highlightTonight}
            onChange={(e) => onHighlightTonightChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-sky-500"
          />
          Highlight tonight's row with a larger font
        </label>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Moon distance rating</h2>
        <p className="mb-3 text-xs text-slate-400">
          Rates each target Bad / Good / Perfect based on how close the Moon comes to it while it's up tonight, used
          for the Planning card's colored Moon panel and the list/thumbnail views' Moon column.
        </p>

        <label className="mb-3 flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={moonRatingEnabled}
            onChange={(e) => onMoonRatingEnabledChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-sky-500"
          />
          Enable Moon distance rating
        </label>

        <div className={`flex flex-wrap items-end gap-3 ${moonRatingEnabled ? '' : 'opacity-40'}`}>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Good starts above (°)
            <input
              type="number"
              min={0}
              max={180}
              step={1}
              value={moonGoodThresholdDeg}
              onChange={(e) => handleGoodThresholdChange(e.target.value)}
              disabled={!moonRatingEnabled}
              className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Perfect starts above (°)
            <input
              type="number"
              min={0}
              max={180}
              step={1}
              value={moonPerfectThresholdDeg}
              onChange={(e) => handlePerfectThresholdChange(e.target.value)}
              disabled={!moonRatingEnabled}
              className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none disabled:cursor-not-allowed"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Closest approach tonight below "Good starts above" is rated Bad (red); between the two values is rated
          Good (amber); at or above "Perfect starts above" is rated Perfect (green).
        </p>

        <label className="mt-4 flex flex-col gap-1 text-xs text-slate-300">
          Value shown in list &amp; thumbnail views
          <select
            value={moonListMetric}
            onChange={(e) => onMoonListMetricChange(e.target.value as MoonListMetric)}
            className="w-40 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
          >
            {(Object.keys(MOON_LIST_METRIC_LABELS) as MoonListMetric[]).map((metric) => (
              <option key={metric} value={metric} className="bg-slate-800">
                {MOON_LIST_METRIC_LABELS[metric]}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-slate-400">
          The Planning card always shows every Moon number; the list and thumbnail views only have room for one, and
          this is also the number used to rate it there.
        </p>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Altitude rating</h2>
        <p className="mb-3 text-xs text-slate-400">
          Rates each target Bad / Good / Perfect based on its average height above the horizon while it's up
          tonight, used for the Planning card's colored height panel — higher is better (less atmosphere in the
          way).
        </p>

        <label className="mb-3 flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={altitudeRatingEnabled}
            onChange={(e) => onAltitudeRatingEnabledChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-sky-500"
          />
          Enable altitude rating
        </label>

        <div className={`flex flex-wrap items-end gap-3 ${altitudeRatingEnabled ? '' : 'opacity-40'}`}>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Good starts above (°)
            <input
              type="number"
              min={0}
              max={90}
              step={1}
              value={altitudeGoodThresholdDeg}
              onChange={(e) => handleAltitudeGoodThresholdChange(e.target.value)}
              disabled={!altitudeRatingEnabled}
              className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Perfect starts above (°)
            <input
              type="number"
              min={0}
              max={90}
              step={1}
              value={altitudePerfectThresholdDeg}
              onChange={(e) => handleAltitudePerfectThresholdChange(e.target.value)}
              disabled={!altitudeRatingEnabled}
              className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none disabled:cursor-not-allowed"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Average altitude tonight below "Good starts above" is rated Bad (red); between the two values is rated
          Good (amber); at or above "Perfect starts above" is rated Perfect (green).
        </p>

        <label className="mt-4 flex flex-col gap-1 text-xs text-slate-300">
          Value shown in list &amp; thumbnail views
          <select
            value={altitudeListMetric}
            onChange={(e) => onAltitudeListMetricChange(e.target.value as AltitudeListMetric)}
            className="w-40 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none"
          >
            {(Object.keys(ALTITUDE_LIST_METRIC_LABELS) as AltitudeListMetric[]).map((metric) => (
              <option key={metric} value={metric} className="bg-slate-800">
                {ALTITUDE_LIST_METRIC_LABELS[metric]}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-slate-400">
          The Planning card always shows both average and max altitude; the list and thumbnail views only have room
          for one, and this is also the number used to rate it there.
        </p>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Frame fit rating</h2>
        <p className="mb-3 text-xs text-slate-400">
          Rates each target Too small / Good / Good for mosaic / Too big based on what portion of the selected
          Seestar's frame it fills, used to tint the Planning views' Frame figure.
        </p>

        <label className="mb-3 flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={frameFitRatingEnabled}
            onChange={(e) => onFrameFitRatingEnabledChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-sky-500"
          />
          Enable frame fit rating
        </label>

        <div className={`flex flex-wrap items-end gap-3 ${frameFitRatingEnabled ? '' : 'opacity-40'}`}>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Good starts above (% of frame)
            <input
              type="number"
              min={0}
              step={1}
              value={frameFitGoodThresholdPercent}
              onChange={(e) => handleFrameFitGoodThresholdChange(e.target.value)}
              disabled={!frameFitRatingEnabled}
              className="w-28 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Good for mosaic starts above (%)
            <input
              type="number"
              min={0}
              step={1}
              value={frameFitMosaicThresholdPercent}
              onChange={(e) => handleFrameFitMosaicThresholdChange(e.target.value)}
              disabled={!frameFitRatingEnabled}
              className="w-28 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Too big starts above (%)
            <input
              type="number"
              min={0}
              step={1}
              value={frameFitTooBigThresholdPercent}
              onChange={(e) => handleFrameFitTooBigThresholdChange(e.target.value)}
              disabled={!frameFitRatingEnabled}
              className="w-28 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-white/20 focus:outline-none disabled:cursor-not-allowed"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Below "Good starts above" is rated Too small (amber); up to "Good for mosaic starts above" is rated Good
          (green); up to "Too big starts above" is rated Good for mosaic (blue) — mosaic mode stitches several
          frames together, so it comfortably covers targets that barely fit a single frame or overflow it a bit; at
          or above "Too big starts above" is rated Too big even for mosaic (red).
        </p>
      </section>
      </>
      )}
      </div>
    </div>
  )
}
