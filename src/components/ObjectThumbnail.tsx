import type { ObjectInfo } from '../../electron/shared-types'
import { THUMBNAIL_SIZE_PX, type ThumbnailSize } from '../lib/thumbnailSize'
import { useObjectImage } from '../lib/useObjectImage'
import { ObjectImageView } from './ObjectImageView'

interface ObjectThumbnailProps {
  object: ObjectInfo
  imagesPath: string
  size: ThumbnailSize
}

export function ObjectThumbnail({ object, imagesPath, size }: ObjectThumbnailProps) {
  const { imageUrl, imageDisplay } = useObjectImage(object, imagesPath, false)
  const sizePx = THUMBNAIL_SIZE_PX[size]

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/30"
      style={{ width: sizePx, height: sizePx }}
    >
      {imageUrl ? (
        <ObjectImageView url={imageUrl} alt={object.name} display={imageDisplay} />
      ) : (
        <span className="text-[10px] text-slate-400">—</span>
      )}
    </div>
  )
}
