import { nonFrameFileTypes } from '../../electron/file-types'
import { formatSize } from '../lib/format'
import type { FileTypeInfo } from '../../electron/shared-types'

interface FileTypeChipsProps {
  fileTypes: FileTypeInfo[]
  /**
   * Compact views pass true to hide the frame formats (fit/fits) already reported as
   * "frames", so only the extra data types a folder holds are surfaced.
   */
  extraOnly?: boolean
  className?: string
}

/** Small "JPG 40 · 32 MB" badges listing the file formats a folder holds. */
export function FileTypeChips({ fileTypes, extraOnly = false, className = '' }: FileTypeChipsProps) {
  const visible = extraOnly ? nonFrameFileTypes(fileTypes) : fileTypes
  if (visible.length === 0) return null

  return (
    <span className={`flex flex-wrap items-center gap-1 ${className}`}>
      {visible.map((fileType) => (
        <span
          key={fileType.extension}
          title={`${fileType.count} .${fileType.extension} file${fileType.count === 1 ? '' : 's'} · ${formatSize(
            fileType.sizeBytes,
          )}`}
          className="rounded border border-white/10 bg-white/[0.06] px-1 py-px text-[10px] font-medium tabular-nums text-slate-300"
        >
          <span className="uppercase">{fileType.extension}</span>{' '}
          <span className="text-slate-200">{fileType.count.toLocaleString()}</span>
        </span>
      ))}
    </span>
  )
}
