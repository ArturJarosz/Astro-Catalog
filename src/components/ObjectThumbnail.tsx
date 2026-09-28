import type { ObjectInfo } from '../../electron/shared-types'
import { THUMBNAIL_SIZE_PX, type ThumbnailSize } from '../lib/thumbnailSize'
import { useObjectImage } from '../lib/useObjectImage'

interface ObjectThumbnailProps {
  object: ObjectInfo
  imagesPath: string
  size: ThumbnailSize
}

export function ObjectThumbnail({ object, imagesPath, size }: ObjectThumbnailProps) {
  const { imageUrl } = useObjectImage(object, imagesPath, false)
  const sizePx = THUMBNAIL_SIZE_PX[size]

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/30"
      style={{ width: sizePx, height: sizePx }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={object.name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] text-slate-400">—</span>
      )}
    </div>
  )
}
