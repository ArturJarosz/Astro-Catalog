import { useState } from 'react'
import type { ObjectImageDisplay } from '../../electron/shared-types'
import { cropLayout } from '../lib/imageDisplay'

interface ObjectImageViewProps {
  url: string
  alt: string
  /** Undefined (e.g. Wikipedia pictures) behaves like a centred crop. */
  display?: ObjectImageDisplay
  /** Called with width / height once the picture has loaded. */
  onAspect?: (aspect: number) => void
}

/**
 * Fills its parent square slot (sized, `overflow-hidden`) with a picture, either whole (`full`)
 * or as the saved square crop.
 */
export function ObjectImageView({ url, alt, display, onAspect }: ObjectImageViewProps) {
  const [loaded, setLoaded] = useState<{ url: string; aspect: number } | null>(null)
  const aspect = loaded?.url === url ? loaded.aspect : null

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget
    if (naturalWidth <= 0 || naturalHeight <= 0) return
    const next = naturalWidth / naturalHeight
    setLoaded({ url, aspect: next })
    onAspect?.(next)
  }

  if (display?.mode === 'full') {
    return <img src={url} alt={alt} onLoad={handleLoad} draggable={false} className="h-full w-full object-contain" />
  }
  if (!display || aspect === null) {
    // Until the size is known (and for pictures without a setting) a centre crop is exact for zoom 1.
    return <img src={url} alt={alt} onLoad={handleLoad} draggable={false} className="h-full w-full object-cover" />
  }
  const layout = cropLayout(display, aspect)
  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={url}
        alt={alt}
        onLoad={handleLoad}
        draggable={false}
        className="absolute max-w-none select-none"
        style={{
          width: `${layout.width * 100}%`,
          height: `${layout.height * 100}%`,
          left: `${layout.left * 100}%`,
          top: `${layout.top * 100}%`,
        }}
      />
    </div>
  )
}
