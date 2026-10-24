import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ObjectInfo, ObjectSummary } from '../../electron/shared-types'

export interface ObjectImageResult {
  imageUrl: string | null
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
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [summary, setSummary] = useState<ObjectSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const imagesVersion = useObjectImagesVersion()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setImageUrl(null)
    setSummary(null)

    async function load() {
      const localImageUrl = imagesPath
        ? await window.astroCatalogue.getLocalObjectImage(imagesPath, object.name).catch(() => null)
        : null
      if (cancelled) return

      if (localImageUrl && !needsSummary) {
        setImageUrl(localImageUrl)
        setLoading(false)
        return
      }

      const fetchedSummary = await window.astroCatalogue
        .getObjectSummary(object.name, object.catalog, object.catalogNumber)
        .catch(() => null)
      if (cancelled) return

      setSummary(fetchedSummary)
      setImageUrl(localImageUrl ?? fetchedSummary?.thumbnailUrl ?? null)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [object.name, object.catalog, object.catalogNumber, imagesPath, needsSummary, imagesVersion])

  return { imageUrl, summary, loading }
}
