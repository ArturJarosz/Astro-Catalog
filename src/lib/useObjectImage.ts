import { useEffect, useState } from 'react'
import type { ObjectInfo, ObjectSummary } from '../../electron/shared-types'

export interface ObjectImageResult {
  imageUrl: string | null
  summary: ObjectSummary | null
  loading: boolean
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
  }, [object.name, object.catalog, object.catalogNumber, imagesPath, needsSummary])

  return { imageUrl, summary, loading }
}
