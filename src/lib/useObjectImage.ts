import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ObjectImageDisplay, ObjectInfo, ObjectSummary } from '../../electron/shared-types'

export interface ObjectImageResult {
  imageUrl: string | null
  /** How the user chose to show their own picture; undefined for Wikipedia pictures. */
  imageDisplay: ObjectImageDisplay | undefined
  summary: ObjectSummary | null
  loading: boolean
}

// Bumped whenever the user adds, deletes or re-orders object pictures, so every mounted
// thumbnail / card / detail modal re-resolves its image without a reload.
let objectImagesVersion = 0
const objectImagesListeners = new Set<() => void>()

export function notifyObjectImagesChanged() {
  objectImagesVersion += 1
  objectImagesListeners.forEach((listener) => listener())
}

function subscribeObjectImages(listener: () => void) {
  objectImagesListeners.add(listener)
  return () => {
    objectImagesListeners.delete(listener)
  }
}

export function useObjectImagesVersion(): number {
  return useSyncExternalStore(subscribeObjectImages, () => objectImagesVersion)
}

/**
 * Resolves the image to show for an object: a locally provided picture (matched by object
 * name inside `imagesPath`) takes priority, falling back to the Wikipedia thumbnail. Shared by
 * ObjectThumbnail and ObjectDetailModal so both surfaces resolve images the same way.
 */
export function useObjectImage(object: ObjectInfo, imagesPath: string, needsSummary: boolean): ObjectImageResult {
  const [image, setImage] = useState<{ url: string; display?: ObjectImageDisplay } | null>(null)
  const [summary, setSummary] = useState<ObjectSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const imagesVersion = useObjectImagesVersion()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setImage(null)
    setSummary(null)

    async function load() {
      const localImage = imagesPath
        ? await window.astroCatalogue.getLocalObjectImage(imagesPath, object.name).catch(() => null)
        : null
      if (cancelled) return

      if (localImage && !needsSummary) {
        setImage(localImage)
        setLoading(false)
        return
      }

      const fetchedSummary = await window.astroCatalogue
        .getObjectSummary(object.name, object.catalog, object.catalogNumber)
        .catch(() => null)
      if (cancelled) return

      setSummary(fetchedSummary)
      const wikipediaUrl = fetchedSummary?.thumbnailUrl
      setImage(localImage ?? (wikipediaUrl ? { url: wikipediaUrl } : null))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [object.name, object.catalog, object.catalogNumber, imagesPath, needsSummary, imagesVersion])

  return { imageUrl: image?.url ?? null, imageDisplay: image?.display, summary, loading }
}
