import { useCallback, useEffect, useState } from 'react'
import type { ObjectImageEntry } from '../../electron/shared-types'
import { notifyObjectImagesChanged, useObjectImagesVersion } from '../lib/useObjectImage'
import { ImageCropEditor } from './ImageCropEditor'
import { ObjectImageView } from './ObjectImageView'

interface ObjectImagesPanelProps {
  objectName: string
  imagesPath: string
  /** File name of the picture currently previewed in the modal's main image slot, if any. */
  previewFileName: string | null
  onPreview: (image: ObjectImageEntry | null) => void
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  // Strip Electron's "Error invoking remote method '…': Error: " prefix.
  return message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
}

/**
 * Lets the user manage their own pictures of an object inside the configured Object images folder
 * (`electron/object-images.ts`): upload, pick the thumbnail, delete.
 */
export function ObjectImagesPanel({ objectName, imagesPath, previewFileName, onPreview }: ObjectImagesPanelProps) {
  const [loadedImages, setImages] = useState<ObjectImageEntry[]>([])
  const images = imagesPath ? loadedImages : []
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editing, setEditing] = useState<ObjectImageEntry | null>(null)
  const imagesVersion = useObjectImagesVersion()

  useEffect(() => {
    if (!imagesPath) return
    let cancelled = false
    window.astroCatalogue
      .listObjectImages(imagesPath, objectName)
      .then((list) => {
        if (!cancelled) setImages(list)
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [imagesPath, objectName, imagesVersion])

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true)
      setError(null)
      try {
        await action()
      } catch (e) {
        setError(errorMessage(e))
      } finally {
        setBusy(false)
        setConfirmDelete(null)
        onPreview(null)
        notifyObjectImagesChanged()
      }
    },
    [onPreview],
  )

  async function handleUpload() {
    const files = await window.astroCatalogue.selectObjectImageFiles()
    if (files.length === 0) return
    await run(() => window.astroCatalogue.addObjectImages(imagesPath, objectName, files))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">
          My images{images.length > 0 && <span className="ml-1 text-xs font-normal text-slate-400">({images.length})</span>}
        </h3>
        <button
          onClick={handleUpload}
          disabled={!imagesPath || busy}
          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Upload images…
        </button>
      </div>

      {!imagesPath && (
        <p className="text-xs text-slate-400">Set the Object images folder in the Configuration tab to add your own pictures.</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image) => {
            const previewing = previewFileName === image.fileName
            return (
              <div key={image.fileName} className="flex flex-col gap-1">
                <button
                  onClick={() => onPreview(previewing ? null : image)}
                  title={image.fileName}
                  className={`relative aspect-square overflow-hidden rounded-md border bg-black/30 ${
                    previewing ? 'border-sky-400' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <ObjectImageView url={image.url} alt={image.fileName} display={image.display} />
                  {image.isPrimary && (
                    <span className="absolute left-1 top-1 rounded bg-sky-500/80 px-1 py-0.5 text-[9px] font-semibold uppercase text-white">
                      Thumbnail
                    </span>
                  )}
                </button>
                <span className="truncate text-[10px] text-slate-400" title={image.fileName}>
                  {image.fileName}
                </span>
                {confirmDelete === image.fileName ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        run(() => window.astroCatalogue.deleteObjectImage(imagesPath, objectName, image.fileName))
                      }
                      disabled={busy}
                      className="flex-1 rounded bg-red-500/20 px-1 py-0.5 text-[10px] font-medium text-red-300 hover:bg-red-500/30"
                    >
                      Move to trash
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="rounded px-1 py-0.5 text-[10px] text-slate-300 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {!image.isPrimary && (
                      <button
                        onClick={() =>
                          run(() => window.astroCatalogue.setPrimaryObjectImage(imagesPath, objectName, image.fileName))
                        }
                        disabled={busy}
                        className="basis-full rounded bg-white/5 px-1 py-0.5 text-[10px] font-medium text-slate-200 hover:bg-white/10"
                      >
                        Use as thumbnail
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(image)}
                      disabled={busy}
                      title="Show the whole picture or choose the cropped part"
                      className="flex-1 rounded px-1 py-0.5 text-[10px] text-slate-200 hover:bg-white/10"
                    >
                      Crop…
                    </button>
                    <button
                      onClick={() => setConfirmDelete(image.fileName)}
                      disabled={busy}
                      className="rounded px-1 py-0.5 text-[10px] text-red-300 hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <ImageCropEditor
          image={editing}
          onSave={async (display) => {
            await window.astroCatalogue.setObjectImageDisplay(imagesPath, objectName, editing.fileName, display)
            onPreview(null)
            notifyObjectImagesChanged()
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
