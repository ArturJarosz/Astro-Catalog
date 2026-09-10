import { formatExposure, formatSize } from './format'

export type MetricKey = 'frames' | 'exposure' | 'size'

export const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: 'frames', label: 'Frames' },
  { key: 'exposure', label: 'Time' },
  { key: 'size', label: 'Space' },
]

export interface MetricValues {
  totalFrames: number
  totalExposureSeconds: number
  totalSizeBytes: number
}

export function formatMetrics(values: MetricValues, metrics: Set<MetricKey>): string {
  const parts: string[] = []
  if (metrics.has('frames')) parts.push(`${values.totalFrames} frames`)
  if (metrics.has('exposure')) parts.push(formatExposure(values.totalExposureSeconds))
  if (metrics.has('size')) parts.push(formatSize(values.totalSizeBytes))
  return parts.join(' · ')
}
